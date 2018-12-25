import { ChildProcess } from "child_process"
import { Command } from "commander"
import * as os from "os"
import * as path from "path"
import { ISshClient, ISshClientBuilder, OnExit } from "./ssh_client"
import { backupFile, getChildProcess, parseIntWithDefaultValue, retry, toFunction } from "./utils"

export interface IOptions {
    identityFile?: string
}

type SshCommand = (options: ReadonlyArray<string>) => Promise<ChildProcess>

export class SshClient implements ISshClient<IOptions> {
    private sshCommand: SshCommand
    constructor(sshCommand: string | SshCommand = "ssh", private timeoutTime: number = 0,
                private knownHostsPath = path.join(os.homedir(), ".ssh", "known_hosts")) {
        if (typeof(sshCommand) === "string") {
            this.sshCommand = toFunction(sshCommand, getChildProcess)
        } else {
            this.sshCommand = sshCommand
        }
    }
    public portForward(port: number, username: string, hostname: string, from: number, to: number,
                       options: IOptions): Promise<OnExit> {
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

        let restoreFile: () => Promise<null> | null = null
        /* Load known_hosts */
        return backupFile(this.knownHostsPath)
        .then((result) => {
            /* Port forward */
            restoreFile = result

            return retry(() => this.sshCommand(args), this.timeoutTime)
        }).then((result: ChildProcess) => {
            return (() => {
                if (result !== null) {
                    result.kill() // Finish
                }

                /* Restore known_hosts */
                return restoreFile()
            }) as OnExit
        })
    }
}

export class SshClientBuilder implements ISshClientBuilder {
    public commandLineArguments(command: Command): Command {
        return command
            .option("--ssh-path <command>", "The path of `ssh` command", "ssh")
            .option("--ssh-timeout-time <time[sec]>", "The timeout time", parseIntWithDefaultValue, 0)
            .option("-i, --identity-file <identity_file>", "The path of identitiy file", undefined)
    }
    public create(command: Command): ISshClient<void> {
        const client = new SshClient(command.sshPath, command.sshTimeoutTime)
        return {
            portForward(port: number, username: string, hostname: string, from: number, to: number,
                        _: void): Promise<OnExit> {
                return client.portForward(port, username, hostname, from, to, { identityFile: command.identityFile})
            },
        }
    }
}
