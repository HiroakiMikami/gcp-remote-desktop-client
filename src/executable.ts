import { ChildProcess, spawn } from "child_process"

export interface IResult {
    stdout: string | null
    stderr: string | null
    process: ChildProcess
}

export class Executable {
    constructor(private command: string) {}
    public async execute(args: string[], useStdout= false, useStderr= false): Promise<IResult> {
        console.error(this.command, args)
        return new Promise<IResult>((resolve, reject) => {
            const p = spawn(this.command, args, {shell: true})
            let stdout: string | null =  null
            if (useStdout) {
                stdout = ""
                p.stdout.on("data", (data) => stdout += data.toString())
            } else {
                p.stdout.pipe(process.stdout)
            }

            let stderr: string | null =  null
            if (useStderr) {
                stderr = ""
                p.stderr.on("data", (data) => stderr += data.toString())
            } else {
                p.stderr.pipe(process.stderr)
            }
            p.on("exit", (code, signal) => {
                if (code === 0) {
                    resolve({stdout, stderr, process: p})
                } else {
                    reject(new Error(`command (${this.command} ${args.join(" ")} exits with code ${code}(${signal})`))
                }
            })
        })
    }
}
