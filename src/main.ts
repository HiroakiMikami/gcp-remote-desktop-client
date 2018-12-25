#!/usr/bin/env node

import { Command } from "commander"
import * as os from "os"
import * as GCP from "./gcp"
import * as OpenSSH from "./openssh"
import { OnExit } from "./ssh_client"
import * as TigerVNC from "./tigervnc"
import { parseIntWithDefaultValue } from "./utils"

const backendOptions = new Command()

let name: string | null = null
let port: number | null = null

new Promise((resolve) => {
    backendOptions
        .version("0.0.1")
        .usage("[backend-options] -- [args]")
        .option("--ssh <ssh-backend>", "the backend of ssh", "OpenSSH")
        .option("--vncviewer <vncviewer-backend>", "the backend of vncviewer", "TigerVNC")
        .option("--cloud <cloud-service>", "the cloud service", "GCP")
        .on("command:*", (args) => {
            args.unshift(process.argv[1])
            args.unshift(process.argv[0])
            resolve(args)
        })
        .parse(process.argv)
}).then((args: string[]) => {
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

    /* parse nameArgument */
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
    const ssh = getSshClientBuilder().create(command)
    const vncviewer = getVncViewerBuilder().create(command)
    const cloud = getCloudBuilder().create(command)

    /* Create VM */
    cloud.createMachine(name, null).then((result) => {
        if (result instanceof Error) {
            return result
        }

        /* Get public IP address */
        return cloud.getPublicIpAddress(name, null)
    }).then((result) => {
        if (result instanceof Error) {
            return result
        }

        /* SSH port forwarding */
        let localPort = command.localPort
        if (localPort < 0) {
            localPort = port
        }
        return ssh.portForward(command.port, command.loginName, result,
                            port, localPort,
                            null)
    }).then(((result) => {
        if (result instanceof Error) {
            return Promise.resolve(result)
        }

        /* Connect to VM via vncviewer */
        let localPort = command.localPort
        if (localPort < 0) {
            localPort = port
        }
        return vncviewer.connect(localPort, null).then((r) => {
            if (r instanceof Error) {
                console.log(r)
            }
            return result
        })
    }) as (result: Error | OnExit) => Promise<Error | OnExit>).then((result) => {
        if (result instanceof Error) {
            console.log(result)
        }

        /* Stop port forwarding */
        (result as OnExit)()
        /* Terimnate VM */
        return cloud.terminateMachine(name, null)
    })
})
