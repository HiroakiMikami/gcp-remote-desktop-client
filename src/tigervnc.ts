import { Command } from "commander"
import { isString } from "util"
import { Configurations } from "./configurations"
import { Executable } from "./executable"
import { IVncViewer, IVncViewerBuilder } from "./vnc_viewer"

type VncViewerCommand = (options: ReadonlyArray<string>) => Promise<null>

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
    public async connect(port: number, options: any): Promise<null> {
        const args = []
        for (const key of Object.keys(options)) {
            args.push(`-${key}`)
            if (options[key] !== null) {
                args.push(`${options[key]}`)
            }
        }
        args.push(`::${port}`)
        await this.vncViewerCommand(args)
        return null
    }
}

export class VncViewerBuilder implements IVncViewerBuilder {
    public commandLineArguments(command: Command, configs: Configurations): Command {
        return command
            .option("--vncviewer-path <command>", "The path of `vncviewer` command",
                    configs["vncviewer-path"] || "vncviewer")
        }
    public create(command: Command): IVncViewer<void> {
        const viewer = new VncViewer(command.vncviewer_path)
        return {
            connect(port: number, _: void): Promise<null> {
                return viewer.connect(port, command.vncViewer)
            },
        }
    }
}
