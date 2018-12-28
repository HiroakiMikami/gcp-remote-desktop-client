import { Command } from "commander"
import { Configurations } from "./configurations"
import { ISshClient, ISshClientBuilder, OnExit } from "./ssh_client"
import * as ssh2 from "ssh2"
import * as fs from "fs"
import * as log4js from "log4js"
import { promisify } from "util";

const logger = log4js.getLogger()

export interface IOptions {
    identityFile?: string
}

export class SshClient implements ISshClient<IOptions> {
    public async portForward(port: number, username: string, hostname: string, from: number, to: number,
                             options: IOptions): Promise<OnExit> {
        let privateKey: Buffer | null = null
        if (options.identityFile) {
            logger.debug(`Read identity-file(${options.identityFile})`)
            privateKey = await promisify(fs.readFile)(options.identityFile)
        }

        const client = new ssh2.Client()
        await new Promise((resolve, reject) => {
            client.on("ready", () => {
                logger.debug(`Forward from ${from} to localhost:${to}`)
                client.forwardOut("127.0.0.1", from, "localhost", to,
                                (err) => {
                                    if (err) {
                                        reject(err)
                                    }
                                    resolve()
                })
            }).connect({
                host: hostname,
                port: port,
                username: username,
                privateKey: privateKey
            })
        })
        return () => Promise.resolve(null)
    }
}

export class SshClientBuilder implements ISshClientBuilder {
    public commandLineArguments(command: Command, configs: Configurations): Command {
        return command
            .option("-i, --identity-file <identity_file>", "The path of identitiy file", configs["identity-file"])
    }
    public create(command: Command): ISshClient<void> {
        const client = new SshClient()
        return {
            portForward(port: number, username: string, hostname: string, from: number, to: number,
                        _: void): Promise<OnExit> {
                return client.portForward(port, username, hostname, from, to, { identityFile: command.identityFile})
            }
        }
    }
}
