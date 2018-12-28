#!/usr/bin/env node

import { Command } from "commander"
import * as log4js from "log4js"
import * as os from "os"
import * as path from "path"
import { load, merge } from "./configurations"
import * as GCP from "./gcp"
import * as OpenSSH from "./openssh"
import { OnExit } from "./ssh_client"
import * as TigerVNC from "./tigervnc"
import { collectAdditionalOptions, parseIntWithDefaultValue } from "./utils"

const logger = log4js.getLogger()

async function main() {
    const configDir =
        process.env.GCP_REMOTE_DESKTOP_CLIENT_GLOBAL_CONFIG_DIR ||
            path.join(os.homedir(), ".config", "gcp-remote-desktop-client")
    const globalConfigPath = path.join(configDir, "global_config.json")
    logger.info(`global config file: ${globalConfigPath}`)
    logger.info(`Load the global config file: ${globalConfigPath}`)

    const tmpGlobalConfig = await load(globalConfigPath)
    const globalConfig = merge(
        { "ssh-client-module": "OpenSSH",  "vnc-viewer-module": "TigerVNC", "log-level": "info" },
        tmpGlobalConfig)

    const backendOptions = new Command()
    const nameArgument = await new Promise<string>((resolve) => {
        backendOptions
            .version("0.0.1")
            .usage("[backend-options] <name>[:display-number|::port] [options]")
            .option("--ssh-client-module <ssh-client-module>", "the module of ssh-client",
                    globalConfig["ssh-client-module"])
            .option("--vnc-viewer-module <vnc-viewer-module>", "the module of vnc-viewer",
                    globalConfig["vnc-viewer-module"])
            .option("--log-level <level>",
                    "One of followings: [trace, debug, info, warn, error, fatal]",
                    globalConfig["log-level"])
            .arguments("<name>[:display-number|::port]")
            .action(resolve)
            .parse(process.argv)
    })
    const args = process.argv.slice(process.argv.indexOf(nameArgument) + 1)
    args.unshift(process.argv[1])
    args.unshift(process.argv[0])

    logger.level = backendOptions.logLevel

    logger.debug(`ssh-client module: ${backendOptions.sshClientModule}`)
    logger.debug(`vnc-viewer module: ${backendOptions.vncViewerModule}`)

    const cloudBuilder = new GCP.CloudBuilder()

    function getSshClientBuilder() {
        if (backendOptions.sshClientModule === "OpenSSH") {
            return new OpenSSH.SshClientBuilder()
        } else {
            throw new Error(`Invalid ssh-client module: ${backendOptions.sshClientModule}`)
        }
    }
    function getVncViewerBuilder() {
        if (backendOptions.vncViewerModule === "TigerVNC") {
            return new TigerVNC.VncViewerBuilder()
        } else {
            throw new Error(`Invalid vnc-viewer module: ${backendOptions.vncViewerModule}`)
        }
    }

    let name: string | null = null
    let port: number | null = null

    /* parse nameArgument */
    logger.info(`Parse nameArgument(${nameArgument})`)
    if (nameArgument.lastIndexOf("::") !== -1) {
        name = nameArgument.substr(0, nameArgument.lastIndexOf("::"))
        port = parseInt(nameArgument.substr(2 + nameArgument.lastIndexOf("::")), 10)
    } else if (nameArgument.lastIndexOf(":") !== -1) {
        name = nameArgument.substr(0, nameArgument.lastIndexOf(":"))
        port = 5900 + parseInt(nameArgument.substr(1 + nameArgument.lastIndexOf(":")), 10)
    } else {
        name = nameArgument
    }
    if (name === null) {
        throw new Error(`A VM name is not specified.`)
    }
    if (port === null) {
        throw new Error(`A port or display-number is not specified.`)
    }
    logger.info(`name: ${name}`)
    logger.info(`port (${name}): ${port}`)

    const configPath = path.join(configDir, `${name}.json`)
    logger.info(`config file: ${configPath}`)
    logger.info(`Load the global config file: ${configPath}`)

    const tmpConfigs = await load(configPath)
    const configs = merge(globalConfig, tmpConfigs)

    let command = new Command()
    command
        .option("--local-port <port>", "The port number of the localhost",
                parseIntWithDefaultValue, configs["local-port"] || -1)
    /* options for ssh-client */
    const sshConfigs = configs[backendOptions.sshClientModule] || {}
    command = getSshClientBuilder().commandLineArguments(command, sshConfigs)
    command.option("--ssh-client <key>=<value>", "The additional options for ssh-client",
                   collectAdditionalOptions, sshConfigs)
    /* options for vnc-viewer */
    const vncViewerConfigs = configs[backendOptions.vncViewerModule] || {}
    command = getVncViewerBuilder().commandLineArguments(command, vncViewerConfigs)
    command.option("--vnc-viewer <key>=<value>", "The additional options for vnc-viewer",
                   collectAdditionalOptions, vncViewerConfigs)
    /* options for cloud */
    command = cloudBuilder.commandLineArguments(command, configs.GCP || {})

    command.parse(args)

    const sshClient = getSshClientBuilder().create(command)
    const vncViewer = getVncViewerBuilder().create(command)
    const cloud = cloudBuilder.create(command)

    let onExit: OnExit | null = null
    try {
        const localPort = (command.localPort < 0) ? port : command.localPort
        logger.info(`port (localhost): ${localPort}`)

        /* Create VM */
        logger.info(`Create VM (${name})`)
        await cloud.createMachine(name, null)
        /* Get public IP address */
        logger.info(`Get public IP address of ${name}`)
        const ip = await cloud.getPublicIpAddress(name, null)
        logger.info(`IP address: ${ip}`)
        /* SSH port forwarding */
        logger.info(`Port forwarding`)
        onExit = await sshClient.portForward(ip, port, localPort, null)
        /* Connect to VM via vnc-viewer */
        logger.info(`Connect to ${name} via vnc-viewer`)
        await vncViewer.connect(localPort, null)
    } catch (err) {
        logger.warn(err)
    }

    if (onExit !== null) {
        /* Stop port forwarding */
        logger.info(`Stop port forwarding`)
        onExit()
    }
    /* Terimnate VM */
    logger.info(`Terminate VM (${name})`)
    return cloud.terminateMachine(name, null)
}

main()
