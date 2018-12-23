import { VncViewer } from "./vnc_viewer"
import { toFunction, doNothing } from './utils'

export interface Options {
    passwordFile?: string
    compressLevel?: number
    qualityLevel?: number
}

type VncViewerCommand = (options: ReadonlyArray<string>) => Promise<Error | null>

export class TigervncViewer implements VncViewer<Options> {
    private vncViewerCommand: VncViewerCommand
    constructor(vncViewerCommand: string | VncViewerCommand = "vncviewer") {
        if (typeof(vncViewerCommand) === 'string') {
            this.vncViewerCommand = toFunction(vncViewerCommand, doNothing)
        } else {
            this.vncViewerCommand = vncViewerCommand
        }
    }
    connect(port: number, options: Options): Promise<Error> {
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
