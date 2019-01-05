import { Command } from "commander"
import { Configurations } from "./configurations"

export interface IVncViewer<Options> {
    connect(port: number, options: Options): Promise<void>
}
export type VncViewerBuilder = (command: Command, configs: Configurations) => (() => IVncViewer<void>)
