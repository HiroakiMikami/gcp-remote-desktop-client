import { ChildProcess } from "child_process"
import { Command } from "commander"
import * as os from "os"
import * as path from "path"
import { isString } from "util"
import { Configurations, copy } from "./configurations"
import { Executable } from "./executable"
import { ISshClient, OnExit } from "./ssh_client"
import { backupFile, collectAdditionalOptions, parseIntWithDefaultValue, retry } from "./utils"

export interface IOptions {
    identityFile?: string
    port: number
    loginName: string
}

type SshCommand = (options: ReadonlyArray<string>) => Promise<ChildProcess>

export class SshClient implements ISshClient<any> {
    private sshCommand: SshCommand
    constructor(sshCommand: string | SshCommand = "ssh", private timeoutTime: number = 0,
                private waitAfterSuccessTime: number = 0,
                private knownHostsPath = path.join(os.homedir(), ".ssh", "known_hosts")) {
        if (isString(sshCommand)) {
            const ssh = new Executable(sshCommand)
            this.sshCommand = (args: string[]) => ssh.execute(args).then((result) => result.process)
        } else {
            this.sshCommand = sshCommand
        }
    }
    public async portForward(hostname: string, from: number, to: number,
                             options: any): Promise<OnExit> {
        const args = ["-o", "StrictHostKeyChecking=no",
                       "-fNT",
                       "-L", `${to}:localhost:${from}`]
        for (const key of Object.keys(options)) {
            args.push(`-${key}`)
            if (options[key] !== null) {
                args.push(`${options[key]}`)
            }
        }
        args.push(hostname)

        /* Load known_hosts */
        const restoreFile = await backupFile(this.knownHostsPath)
        /* Port forward */
        const p = await retry(() => this.sshCommand(args), this.timeoutTime)
        /* Wait */
        await new Promise((resolve) => setTimeout(resolve, this.waitAfterSuccessTime * 1000))
        return () => {
            if (p !== null) {
                p.kill() // Finish
            }

            /* Restore known_hosts */
            return restoreFile()
        }
    }
}

export function buildSshClient(command: Command, configs: Configurations): () => ISshClient<void> {
    const options = copy(configs)
    delete options["ssh-timeout-time"]
    delete options["ssh-path"]
    delete options["ssh-wait-after-success-time"]
    command
        .option("--ssh-client <key>=<value>", "The additional options for ssh-client",
                collectAdditionalOptions, options)
        .option("--ssh-path <command>", "The path of `ssh` command", configs["ssh-path"] || "ssh")
        .option("--ssh-timeout-time <time[sec]>", "The timeout time",
                parseIntWithDefaultValue, configs["ssh-timeout-time"] || 0)
        .option("--ssh-wait-after-success-time <time[sec]>", "The wait time after success",
                parseIntWithDefaultValue, configs["ssh-wait-after-success-time"] || 0)
    return () => {
        const client = new SshClient(command.sshPath, command.sshTimeoutTime, command.sshWaitAfterSuccessTime)
        return {
            portForward(hostname: string, from: number, to: number,
                        _: void): Promise<OnExit> {
                return client.portForward(hostname, from, to, command.sshClient)
            },
        }
    }
}
