import { Command } from "commander"
import { ISshClient, ISshClientBuilder } from "./ssh_client"
import { doNothing, toFunction } from "./utils"

export interface IOptions {
    identityFile?: string
}

type SshCommand = (options: ReadonlyArray<string>) => Promise<Error | null>

export class SshClient implements ISshClient<IOptions> {
    private sshCommand: SshCommand
    constructor(sshCommand: string | SshCommand = "ssh") {
        if (typeof(sshCommand) === "string") {
            this.sshCommand = toFunction(sshCommand, doNothing)
        } else {
            this.sshCommand = sshCommand
        }
    }
    public portForward(port: number, username: string, hostname: string, from: number, to: number,
                       options: IOptions): Promise<Error> {
        const args = ["-o", "StrictHostKeyChecking=no",
                        "-fNT",
                         "-p", `${port}`,
                         "-L", `${to}:localhost:${from}`,
                         "-l", username]
        if (options.identityFile !== undefined) {
            args.push("-i")
            args.push(`${options.identityFile}`)
        }
        args.push(hostname)
        return this.sshCommand(args)
    }
}

export class SshClientBuilder implements ISshClientBuilder {
    public commandLineArguments(command: Command): Command {
        return command
            .option("--ssh-path <command>", "The path of `ssh` command", "ssh")
            .option("-i, --identity-file <identity_file>", "The path of identitiy file", undefined)
    }
    public create(command: Command): ISshClient<void> {
        const client = new SshClient(command.sshPath)
        return {
            portForward(port: number, username: string, hostname: string, from: number, to: number,
                        _: void): Promise<Error> {
                return client.portForward(port, username, hostname, from, to, { identityFile: command.identityFile})
            },
        }
    }
}
