import { Command } from "commander"
import { Configurations } from "./configurations"

export interface IVncViewer<Options> {
    connect(port: number, options: Options): Promise<null>
}
export interface IVncViewerBuilder {
    commandLineArguments(command: Command, configs: Configurations): Command
    create(command: Command): IVncViewer<void>
}
