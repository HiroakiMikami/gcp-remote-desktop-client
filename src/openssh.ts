import { ISshClient } from "./ssh_client"
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
                         "-p", `${port}`,
                         "-L", `${from}:localhost:${to}`,
                         "-l", username]
        if (options.identityFile !== undefined) {
            args.push("-i")
            args.push(`${options.identityFile}`)
        }
        args.push(hostname)
        return this.sshCommand(args)
    }
}
