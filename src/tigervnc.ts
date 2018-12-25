import { Command } from "commander"
import * as os from "os"
import * as path from "path"
import { doNothing, toFunction } from "./utils"
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
        if (typeof(vncViewerCommand) === "string") {
            this.vncViewerCommand = toFunction(vncViewerCommand, doNothing)
        } else {
            this.vncViewerCommand = vncViewerCommand
        }
    }
    public connect(port: number, options: IOptions): Promise<null> {
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
        return this.vncViewerCommand(args)
    }
}

export class VncViewerBuilder implements IVncViewerBuilder {
    public commandLineArguments(command: Command): Command {
        return command
            .option("--vncviewer-path <command>", "The path of `vncviewer` command", "vncviewer")
            .option("--password-file <password-file>", "The path of vnc password file",
                path.join(os.homedir(), ".vnc", "passwd"))
            .option("--quality-level <q>", "The JPEG quality level, 0 = Low, 9 = High", undefined)
            .option("--compress-level <c>", "The compression level, 0 = Low, 9 = High", undefined)
        }
    public create(command: Command): IVncViewer<void> {
        const viewer = new VncViewer(command.vncviewer_path)
        return {
            connect(port: number, _: void): Promise<null> {
                return viewer.connect(port, {
                    compressLevel: command.compressLevel,
                    passwordFile: command.passwordFile,
                    qualityLevel: command.qualityLevel })
            },
        }
    }
}
