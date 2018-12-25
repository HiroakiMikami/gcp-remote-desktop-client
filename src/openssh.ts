import { ChildProcess } from "child_process"
import { Command } from "commander"
import * as os from "os"
import * as path from "path"
import { isString } from "util"
import { Configurations } from "./configurations"
import { Executable } from "./executable"
import { ISshClient, ISshClientBuilder, OnExit } from "./ssh_client"
import { backupFile, parseIntWithDefaultValue, retry } from "./utils"

export interface IOptions {
    identityFile?: string
}

type SshCommand = (options: ReadonlyArray<string>) => Promise<ChildProcess>

export class SshClient implements ISshClient<IOptions> {
    private sshCommand: SshCommand
    constructor(sshCommand: string | SshCommand = "ssh", private timeoutTime: number = 0,
                private knownHostsPath = path.join(os.homedir(), ".ssh", "known_hosts")) {
        if (isString(sshCommand)) {
            const ssh = new Executable(sshCommand)
            this.sshCommand = (args: string[]) => ssh.execute(args).then((result) => result.process)
        } else {
            this.sshCommand = sshCommand
        }
    }
    public async portForward(port: number, username: string, hostname: string, from: number, to: number,
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

        /* Load known_hosts */
        const restoreFile = await backupFile(this.knownHostsPath)
        /* Port forward */
        const p = await retry(() => this.sshCommand(args), this.timeoutTime)
        return () => {
            if (p !== null) {
                p.kill() // Finish
            }

            /* Restore known_hosts */
            return restoreFile()
        }
    }
}

export class SshClientBuilder implements ISshClientBuilder {
    public commandLineArguments(command: Command, configs: Configurations): Command {
        return command
            .option("--ssh-path <command>", "The path of `ssh` command", "ssh")
            .option("--ssh-timeout-time <time[sec]>", "The timeout time",
                    parseIntWithDefaultValue, configs["ssh-timeout-time"] || 0)
            .option("-i, --identity-file <identity_file>", "The path of identitiy file", configs["identity-file"])
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
