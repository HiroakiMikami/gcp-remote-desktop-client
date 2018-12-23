import { SshClient } from './ssh_client'
import { toFunction, doNothing } from './utils'

export interface Options {
    identityFile: string | null
}

type SshCommand = (options: ReadonlyArray<string>) => Promise<Error | null>

export class Openssh implements SshClient<Options> {
    private sshCommand: SshCommand
    constructor(sshCommand: string | SshCommand = "ssh") {
        if (typeof(sshCommand) === 'string') {
            this.sshCommand = toFunction(sshCommand, doNothing)
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
