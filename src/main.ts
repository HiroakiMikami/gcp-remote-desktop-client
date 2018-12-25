#!/usr/bin/env node

import { Command } from "commander"
import * as log4js from "log4js"
import * as os from "os"
import * as GCP from "./gcp"
import * as OpenSSH from "./openssh"
import { OnExit } from "./ssh_client"
import * as TigerVNC from "./tigervnc"
import { parseIntWithDefaultValue } from "./utils"

const backendOptions = new Command()

let name: string | null = null
let port: number | null = null

const logger = log4js.getLogger()

async function main() {
    const args = await new Promise<string[]>((resolve) => {
        backendOptions
            .version("0.0.1")
            .usage("[backend-options] -- [args]")
            .option("--ssh <ssh-backend>", "the backend of ssh", "OpenSSH")
            .option("--vncviewer <vncviewer-backend>", "the backend of vncviewer", "TigerVNC")
            .option("--cloud <cloud-service>", "the cloud service", "GCP")
            .option("--log-level <level>", "One of followings: [trace, debug, info, warn, error, fatal]", "info")
            .on("command:*", (xs) => {
                xs.unshift(process.argv[1])
                xs.unshift(process.argv[0])
                resolve(xs)
            })
            .parse(process.argv)
    })
    logger.level = backendOptions.logLevel

    logger.debug(`ssh backend: ${backendOptions.ssh}`)
    logger.debug(`vncviewer backend: ${backendOptions.vncviewer}`)
    logger.debug(`cloud backend: ${backendOptions.cloud}`)

    function getSshClientBuilder() {
        if (backendOptions.ssh === "OpenSSH") {
            return new OpenSSH.SshClientBuilder()
        } else {
            throw new Error(`Invalid ssh backend: ${backendOptions.ssh}`)
        }
    }
    function getVncViewerBuilder() {
        if (backendOptions.vncviewer === "TigerVNC") {
            return new TigerVNC.VncViewerBuilder()
        } else {
            throw new Error(`Invalid vncviewer backend: ${backendOptions.vncviewer}`)
        }
    }
    function getCloudBuilder() {
        if (backendOptions.cloud === "GCP") {
            return new GCP.CloudBuilder()
        } else {
            throw new Error(`Invalid cloud backend: ${backendOptions.cloud}`)
        }
    }

    let nameArgument: string | null = null
    let command = new Command()
    command
        .arguments("<name>[:display-number|::port]")
        .action((nameArg) => nameArgument = nameArg)
        .option("--local-port <port>", "The port number of the localhost", parseIntWithDefaultValue, -1)
    /* options for ssh client */
    command
        .option("-p, --port <port>", "The port number", parseIntWithDefaultValue, 22)
        .option("-l, --login-name <login_name>", "The login name", os.userInfo().username)
    command = getSshClientBuilder().commandLineArguments(command)
    /* options for vncviewer */
    command = getVncViewerBuilder().commandLineArguments(command)
    /* options for cloud */
    command = getCloudBuilder().commandLineArguments(command)
    command.parse(args)

    const ssh = getSshClientBuilder().create(command)
    const vncviewer = getVncViewerBuilder().create(command)
    const cloud = getCloudBuilder().create(command)

    let onExit: OnExit | null = null
    try {
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
        const localPort = (command.localPort < 0) ? port : command.localPort

        /* Create VM */
        logger.info(`Create VM (${name})`)
        await cloud.createMachine(name, null)
        /* Get public IP address */
        logger.info(`Get public IP address of ${name}`)
        const ip = await cloud.getPublicIpAddress(name, null)
        logger.info(`IP address of ${name}: ${ip}`)
        /* SSH port forwarding */
        logger.info(`Port forwarding`)
        onExit = await ssh.portForward(command.port, command.loginName, ip,
                                            port, localPort, null)
        /* Connect to VM via vncviewer */
        logger.info(`Connect to ${name} via vncviewer`)
        await vncviewer.connect(localPort, null)
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
