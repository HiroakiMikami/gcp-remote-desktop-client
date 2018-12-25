import { Command } from "commander"
export interface IVncViewer<Options> {
    connect(port: number, options: Options): Promise<null>
}
export interface IVncViewerBuilder {
    commandLineArguments(command: Command): Command
    create(command: Command): IVncViewer<void>
}
