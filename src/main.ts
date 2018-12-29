#!/usr/bin/env node

import { Command } from "commander"
import * as log4js from "log4js"
import * as os from "os"
import * as path from "path"
import { ICloud } from "./cloud"
import { load, merge } from "./configurations"
import * as GCP from "./gcp"
import * as OpenSSH from "./openssh"
import { IRemoteDesktop } from "./remote_desktop"
import * as TigerVNC from "./tigervnc"
import * as VNCwithSSH from "./vnc_with_ssh"

const logger = log4js.getLogger()

async function main() {
    /* Get configuration directory */
    const configDir =
        process.env.GCP_REMOTE_DESKTOP_CLIENT_GLOBAL_CONFIG_DIR ||
            path.join(os.homedir(), ".config", "gcp-remote-desktop-client")
    const globalConfigPath = path.join(configDir, "global_config.json")

    /* Load the global configuration file */
    logger.info(`global config file: ${globalConfigPath}`)
    logger.info(`Load the global config file: ${globalConfigPath}`)
    let globalConfig = await load(globalConfigPath)
    globalConfig = merge(
        { "log-level": "info",
          "ssh-client-module": process.env.GCP_REMOTE_DESKTOP_SSH_CLIENT_MODULE || "OpenSSH",
          "vnc-viewer-module": process.env.GCP_REMOTE_DESKTOP_VNC_VIEWER_MODULE || "TigerVNC",
        },
        globalConfig)

    const backendCommand = new Command()
        .version("0.0.1")
        .option("--log-level <level>",
                "One of followings: [trace, debug, info, warn, error, fatal]",
                globalConfig["log-level"])
        .option("--disk-name <name>", "The disk name of the VM")
    // dummyOptions
    VNCwithSSH.buildRemoteDesktop(backendCommand, {})
    backendCommand.parse(process.argv)
    logger.level = backendCommand.logLevel

    logger.debug(`ssh-client module: ${globalConfig["ssh-client-module"]}`)
    logger.debug(`vnc-viewer module: ${globalConfig["vnc-viewer-module"]}`)

    function getSshClientBuilder() {
        if (globalConfig["ssh-client-module"] === "OpenSSH") {
            return OpenSSH.buildSshClient
        } else {
            throw new Error(`Invalid ssh-client module: ${globalConfig["ssh-client-module"]}`)
        }
    }
    function getVncViewerBuilder() {
        if (globalConfig["vnc-viewer-module"] === "TigerVNC") {
            return TigerVNC.buildVncViewer
        } else {
            throw new Error(`Invalid vnc-viewer module: ${globalConfig["vnc-viewer-module"]}`)
        }
    }

    const name: string = backendCommand.diskName
    if (!name) {
        throw new Error("The disk name is not specified")
    }

    logger.info(`disk-name: ${name}`)

    const configPath = path.join(configDir, `${name}.json`)
    logger.info(`config file: ${configPath}`)
    logger.info(`Load the global config file: ${configPath}`)

    const tmpConfigs = await load(configPath)
    const configs = merge(globalConfig, tmpConfigs)
    const sshConfigs = configs[globalConfig["ssh-client-module"]] || {}
    const vncViewerConfigs = configs[globalConfig["vnc-viewer-module"]] || {}

    let getCloud: () => ICloud<void, void, void> | null = null
    const remoteDesktop: IRemoteDesktop<void> = await new Promise((resolve) => {
        const command = new Command()
        command
            .version("0.0.1")
            .option("--log-level <level>",
                    "One of followings: [trace, debug, info, warn, error, fatal]",
                    globalConfig["log-level"])
            .option("--disk-name <name>", "The disk name of the VM")
        /* Prepare remote-desktop commands */
        const getVncWithSsh = VNCwithSSH.buildRemoteDesktop(command, configs)
        /* Prepare options for ssh-client */
        const getSshClient = getSshClientBuilder()(command, sshConfigs)
        /* Prepare options for vnc-viewer */
        const getVncViewer = getVncViewerBuilder()(command, vncViewerConfigs)
        /* Prepare options for cloud */
        getCloud = GCP.buildCloud(command, configs.GCP || {})
        command.action(() => {
            resolve(getVncWithSsh({ sshClient: getSshClient(), vncViewer: getVncViewer() }))
        })
        command.parse(process.argv)
    })
    const cloud = getCloud()

    try {
        /* Create VM */
        logger.info(`Create VM (${name})`)
        await cloud.createMachine(name, null)
        /* Get public IP address */
        logger.info(`Get public IP address of ${name}`)
        const ip = await cloud.getPublicIpAddress(name, null)
        logger.info(`IP address: ${ip}`)
        /* Run remote-desktop application */
        await remoteDesktop.connect(ip, null)
    } catch (err) {
        logger.warn(err)
    }

    /* Terimnate VM */
    logger.info(`Terminate VM (${name})`)
    return cloud.terminateMachine(name, null)
}

main()
