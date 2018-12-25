import { Command } from "commander"

export interface ISshClient<Options> {
    portForward(port: number, username: string, hostname: string,
                from: number, to: number, options: Options): Promise<Error | null>
}
export interface ISshClientBuilder {
    commandLineArguments(command: Command): Command
    create(command: Command): ISshClient<void>
}
