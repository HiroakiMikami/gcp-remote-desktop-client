import { Command } from "commander"
import * as os from "os"
import * as path from "path"
import { isString } from "util"
import { Configurations } from "./configurations"
import { Executable } from "./executable"
import { parseIntWithDefaultValue, retry } from "./utils"
import { IVncViewer, IVncViewerBuilder } from "./vnc_viewer"

export interface IOptions {
    passwordFile?: string
    compressLevel?: number
    qualityLevel?: number
}

type VncViewerCommand = (options: ReadonlyArray<string>) => Promise<null>

export class VncViewer implements IVncViewer<IOptions> {
    private vncViewerCommand: VncViewerCommand
    constructor(vncViewerCommand: string | VncViewerCommand = "vncviewer", private timeoutTime: number = 0) {
        if (isString(vncViewerCommand)) {
            const vncviewer = new Executable(vncViewerCommand)
            this.vncViewerCommand = (args: string[]) => {
                return vncviewer.execute(args, true, true).then((result) => {
                    if (result.stdout.indexOf("refused") !== -1) {
                        throw new Error(result.stdout)
                    }
                    return null
                })
            }
        } else {
            this.vncViewerCommand = vncViewerCommand
        }
    }
    public async connect(port: number, options: IOptions): Promise<null> {
        const args: string[] = []
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

        await retry(() => this.vncViewerCommand(args), this.timeoutTime)
        return null
    }
}

export class VncViewerBuilder implements IVncViewerBuilder {
    public commandLineArguments(command: Command, configs: Configurations): Command {
        return command
            .option("--vncviewer-path <command>", "The path of `vncviewer` command", "vncviewer")
            .option("--vncviewer-timeout-time <time[sec]>", "The timeout time",
                    parseIntWithDefaultValue, configs["vncviewer-timeout-time"] || 0)
            .option("--password-file <password-file>", "The path of vnc password file",
                configs["password-file"] || path.join(os.homedir(), ".vnc", "passwd"))
            .option("--quality-level <q>", "The JPEG qualit, command.vncviewerTimeoutTimey level, 0 = Low, 9 = High",
                configs["quality-level"] || undefined)
            .option("--compress-level <c>", "The compression level, 0 = Low, 9 = High",
                configs["compress-level"] || undefined)
        }
    public create(command: Command): IVncViewer<void> {
        const viewer = new VncViewer(command.vncviewer_path, command.vncviewerTimeoutTime)
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
