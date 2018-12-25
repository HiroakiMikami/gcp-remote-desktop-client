import { Command } from "commander"

export type OnExit = () => Promise<null>

export interface ISshClient<Options> {
    portForward(port: number, username: string, hostname: string,
                from: number, to: number, options: Options): Promise<OnExit>
}
export interface ISshClientBuilder {
    commandLineArguments(command: Command): Command
    create(command: Command): ISshClient<void>
}
