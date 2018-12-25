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

type GetResult<Result> =
    (commandName: string, args: ReadonlyArray<string>, command: ChildProcess)
        => Promise<Result>

export const getChildProcess: GetResult<ChildProcess> = (cmd, args, p) => {
    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)
    return new Promise((resolve, reject) => {
        p.on("exit", (code, signal) => {
            if (code === 0) {
                resolve(p)
            } else {
                reject(new Error(`command (${cmd} ${args.join(" ")} exits with code ${code}(${signal})`))
            }
        })
    })
}
export const doNothing: GetResult<null> = (cmd, args, p) => {
    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)
    return new Promise((resolve, reject) => {
        p.on("exit", (code, signal) => {
            if (code === 0) {
                resolve(null)
            } else {
                reject(new Error(`command (${cmd} ${args.join(" ")} exits with code ${code}(${signal})`))
            }
        })
    })
}
export function getResultFromStdout<Result>(getResult: (stdout: string) => Result): GetResult<Result> {
    return (cmd, args, p) => {
        let stdout = ""
        p.stdout.on("data", (data) => stdout += data.toString())
        p.stderr.pipe(process.stderr)

        return new Promise((resolve, reject) => {
            p.on("exit", (code, signal) => {
                if (code === 0) {
                    resolve(getResult(stdout))
                } else {
                    reject(new Error(`command (${cmd} ${args.join(" ")} exits with code ${code}(${signal})`))
                }
            })
        })
    }
}

export function toFunction<Result>(command: string, getResult: GetResult<Result>) {
    return (args: ReadonlyArray<string>)  => {
        console.error(command, args)
        const process = spawn(command, args, {shell: true})
        return getResult(command, args, process)
    }
}
