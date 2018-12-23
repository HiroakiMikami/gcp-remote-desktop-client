import { spawn } from 'child_process'

import { VncViewer } from "./vnc_viewer"

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
            this.vncViewerCommand = args => {
                return new Promise((resolve) => {
                    const ssh = spawn(vncViewerCommand, args, {shell: true})
                    ssh.stdout.pipe(process.stdout)
                    ssh.stderr.pipe(process.stderr)
                    ssh.on('exit', (code, signal) => {
                        if (code == 0) {
                            resolve(null)
                        } else {
                            resolve(new Error(`vncviewer command (${vncViewerCommand} ${args.join(" ")} exits with code ${code}(${signal}`))
                        }
                    })
                })
            }
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
