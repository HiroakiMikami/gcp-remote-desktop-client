import { Command } from "commander"
import { Configurations } from "./configurations"

export type OnExit = () => Promise<null>

export interface ISshClient<Options> {
    portForward(port: number, username: string, hostname: string,
                from: number, to: number, options: Options): Promise<OnExit>
}
export interface ISshClientBuilder {
    commandLineArguments(command: Command, configs: Configurations): Command
    create(command: Command): ISshClient<void>
}
