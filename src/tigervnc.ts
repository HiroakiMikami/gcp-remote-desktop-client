import { Command } from "commander"
import { isString } from "util"
import { Configurations } from "./configurations"
import { Executable } from "./executable"
import { collectAdditionalOptions } from "./utils"
import { IVncViewer } from "./vnc_viewer"

type VncViewerCommand = (options: ReadonlyArray<string>) => Promise<void>

export class VncViewer implements IVncViewer<any> {
    private vncViewerCommand: VncViewerCommand
    constructor(vncViewerCommand: string | VncViewerCommand = "vncviewer") {
        if (isString(vncViewerCommand)) {
            const vncviewer = new Executable(vncViewerCommand)
            this.vncViewerCommand = (args: string[]) => vncviewer.execute(args).then(() => null)
        } else {
            this.vncViewerCommand = vncViewerCommand
        }
    }
    public async connect(port: number, options: any): Promise<void> {
        const args = []
        for (const key of Object.keys(options)) {
            args.push(`-${key}`)
            if (options[key] !== null) {
                args.push(`${options[key]}`)
            }
        }
        args.push(`::${port}`)
        await this.vncViewerCommand(args)
    }
}

export function buildVncViewer(command: Command, configs: Configurations): () => IVncViewer<void> {
    command
        .option("--vnc-viewer <key>=<value>", "The additional options for vnc-viewer",
                collectAdditionalOptions, configs)
        .option("--vncviewer-path <command>", "The path of `vncviewer` command",
                configs["vncviewer-path"] || "vncviewer")
    return () => {
        const viewer = new VncViewer(command.vncviewer_path)
        return {
            connect(port: number, _: void): Promise<void> {
                return viewer.connect(port, command.vncViewer)
            },
        }
    }
}
