import { ChildProcess, spawn } from "child_process"
import * as fs from "fs"
import * as util from "util"

export function parseIntWithDefaultValue(value: string, _: number) {
    return parseInt(value, 10)
}

export async function backupFile(path: string): Promise<() => Promise<null>> {
    const exists = util.promisify(fs.exists)
    const readFile = util.promisify(fs.readFile)
    const writeFile = util.promisify(fs.writeFile)
    const unlink = util.promisify(fs.unlink)
    const e = await exists(path)

    let originalFile: string | null = null
    if (e) {
        originalFile = (await readFile(path)).toString()
    }

    return async () => {
        if (originalFile === null) {
            await unlink(path)
            return null
        } else {
            await writeFile(path, originalFile)
            return null
        }
    }
}

/**
 *
 * @param procedure The function to execute
 * @param duration The timeout time [sec]
 */
export function retry<Result>(procedure: () => Promise<Result>, duration: number): Promise<Result> {
    const beginTime = new Date().getTime()
    function execute(previous: Promise<Result>): Promise<Result> {
        return previous.catch((err) => {
            const time = new Date().getTime()
            if ((time - beginTime) > duration * 1000) {
                // Timeout
                return Promise.reject(err)
            }
            const next = procedure()
            return execute(next)
        })
    }
    return execute(procedure())
}

export function toFunction<Result>(command: string,
                                   convert: (stdout: string, p: ChildProcess) => Result,
                                   useStdout: boolean = false) {
    return (args: ReadonlyArray<string>)  => {
        console.error(command, args)
        return new Promise<Result>((resolve, reject) => {
            const p = spawn(command, args, {shell: true})
            let stdout = ""
            if (useStdout) {
                p.stdout.on("data", (data) => stdout += data.toString())
            } else {
                p.stdout.pipe(process.stdout)
            }
            p.stderr.pipe(process.stderr)
            p.on("exit", (code, signal) => {
                if (code === 0) {
                    resolve(convert(stdout, p))
                } else {
                    reject(new Error(`command (${command} ${args.join(" ")} exits with code ${code}(${signal})`))
                }
            })
        })
    }
}
