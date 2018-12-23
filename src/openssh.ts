import { spawn } from 'child_process'

import { SshClient } from './ssh_client'

export interface Options {
    identityFile: string | null
}

type SshCommand = (options: ReadonlyArray<string>) => Promise<Error | null>

export class Openssh implements SshClient<Options> {
    private sshCommand: SshCommand
    constructor(sshCommand: string | SshCommand = "ssh") {
        if (typeof(sshCommand) === 'string') {
            this.sshCommand = args => {
                return new Promise((resolve) => {
                    const ssh = spawn(sshCommand, args, {shell: true})
                    ssh.stdout.pipe(process.stdout)
                    ssh.stderr.pipe(process.stderr)
                    ssh.on('exit', (code, signal) => {
                        if (code == 0) {
                            resolve(null)
                        } else {
                            resolve(new Error(`ssh command (${sshCommand} ${args.join(" ")} exits with code ${code}(${signal}`))
                        }
                    })
                })
            }
        } else {
            this.sshCommand = sshCommand
        }
    }
    portForward(port: number, username: string, hostname: string, from: number, to: number, options: Options): Promise<Error> {
        let args = ["-o", "StrictHostKeyChecking=no",
                         "-p", `${port}`,
                         "-L", `${from}:localhost:${to}`,
                         "-l", username]
        if (options.identityFile != null) {
            args.push("-i")
            args.push(`${options.identityFile}`)
        }
        args.push(hostname)
        return this.sshCommand(args)
    }
}
