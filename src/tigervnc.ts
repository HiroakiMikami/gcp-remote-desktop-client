import { IVncViewer } from "./vnc_viewer"
import { toFunction, doNothing } from './utils'

export interface IOptions {
    passwordFile?: string
    compressLevel?: number
    qualityLevel?: number
}

type VncViewerCommand = (options: ReadonlyArray<string>) => Promise<Error | null>

export class VncViewer implements IVncViewer<IOptions> {
    private vncViewerCommand: VncViewerCommand
    constructor(vncViewerCommand: string | VncViewerCommand = "vncviewer") {
        if (typeof(vncViewerCommand) === 'string') {
            this.vncViewerCommand = toFunction(vncViewerCommand, doNothing)
        } else {
            this.vncViewerCommand = vncViewerCommand
        }
    }
    connect(port: number, options: IOptions): Promise<Error> {
        let args = []
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
