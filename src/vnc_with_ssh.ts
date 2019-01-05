import { Command } from "commander"
import * as log4js from "log4js"
import { IBackend } from "./backend"
import { Configurations } from "./configurations"
import { IRemoteDesktop } from "./remote_desktop"
import { ISshClient, OnExit } from "./ssh_client"
import { parseIntWithDefaultValue } from "./utils"
import { IVncViewer } from "./vnc_viewer"

export interface IOptions<SshOptions, VncViewerOptions> {
    localPort?: number
    port: number
    displayNumber: number
    sshOptions: SshOptions
    vncViewerOptions: VncViewerOptions
}

export class RemoteDesktop<SshOptions, VncViewerOptions>
     implements IRemoteDesktop<IOptions<SshOptions, VncViewerOptions>> {
    constructor(private sshClient: ISshClient<SshOptions>,
                private vncViewer: IVncViewer<VncViewerOptions>) {}
    public async connect(hostname: string, options: IOptions<SshOptions, VncViewerOptions>): Promise<void> {
        const logger = log4js.getLogger()

        let onExit: OnExit | null = null
        try {
            let port
            if (options.port) {
                port = options.port
            } else if (options.displayNumber) {
                port = options.displayNumber + 5900
            } else {
                throw new Error("Neither port nor displayNumber is not specified")
            }
            const localPort = options.localPort || port

            logger.info(`port (localhost): ${localPort}`)
            logger.info(`port (remote): ${port}`)

            /* SSH port forwarding */
            logger.info(`Port forwarding`)
            onExit = await this.sshClient.portForward(hostname, port, localPort, options.sshOptions)
            /* Connect to VM via vnc-viewer */
            logger.info(`Connect to ${hostname} via vnc-viewer`)
            await this.vncViewer.connect(localPort, options.vncViewerOptions)
        } catch (err) {
            logger.warn(err)
        }

        if (onExit !== null) {
            /* Stop port forwarding */
            logger.info(`Stop port forwarding`)
            onExit()
        }
    }
}

export function buildRemoteDesktop(command: Command,
                                   configs: Configurations): ((backend: IBackend) => IRemoteDesktop<void>) {
    command.command("vnc-with-ssh <:display-number|::port>")
        // .action(x => portString = x)
        .option("--local-port <port>", "The port number of the localhost",
            parseIntWithDefaultValue, configs["local-port"] || -1)
    return (backend: IBackend) => {
        const portString = (command.args.length >= 2) ? command.args[1] : null
        if (portString === null) {
            throw new Error("Neither display-number nor port is specified")
        }

        let port: number | null = null
        let displayNumber: number | null = null
        if (portString.lastIndexOf("::") !== -1) {
            port = parseInt(portString.substr(2 + portString.lastIndexOf("::")), 10)
        } else if (portString.lastIndexOf(":") !== -1) {
            displayNumber = parseInt(portString.substr(1 + portString.lastIndexOf(":")), 10)
        }
        const localPort = (command.localPort < 0) ? null : command.localPort

        const remoteDesktop = new RemoteDesktop<void, void>(backend.sshClient, backend.vncViewer)
        const options: IOptions<void, void> = {
            displayNumber,
            localPort,
            port,
            sshOptions: null,
            vncViewerOptions: null,
        }

        return {
            connect(hostname: string, _: void) {
                return remoteDesktop.connect(hostname, options)
            },
        }
    }
}
