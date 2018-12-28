import { Command } from "commander"
import { isString } from "util"
import { Configurations } from "./configurations"
import { Executable } from "./executable"
import { IVncViewer, IVncViewerBuilder } from "./vnc_viewer"

export interface IOptions {
    passwordFile?: string
    compressLevel?: number
    qualityLevel?: number
}

type VncViewerCommand = (options: ReadonlyArray<string>) => Promise<null>

export class VncViewer implements IVncViewer<IOptions> {
    private vncViewerCommand: VncViewerCommand
    constructor(vncViewerCommand: string | VncViewerCommand = "vncviewer") {
        if (isString(vncViewerCommand)) {
            const vncviewer = new Executable(vncViewerCommand)
            this.vncViewerCommand = (args: string[]) => vncviewer.execute(args).then(() => null)
        } else {
            this.vncViewerCommand = vncViewerCommand
        }
    }
    public async connect(port: number, options: IOptions): Promise<null> {
        const args = []
        if (options.passwordFile !== undefined) {
            args.push("-PasswordFile")
            args.push(options.passwordFile)
        }
        if (options.compressLevel !== undefined) {
            args.push("-CompressLevel")
            args.push(`${options.compressLevel}`)
        }
        if (options.qualityLevel !== undefined) {
            args.push("-QualityLevel")
            args.push(`${options.qualityLevel}`)
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
                return viewer.connect(port, {
                    compressLevel: command.vncViewer["compress-level"],
                    passwordFile: command.vncViewer["password-file"],
                    qualityLevel: command.vncViewer["quality-level"] })
            },
        }
    }
}
