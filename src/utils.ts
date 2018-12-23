import { spawn, ChildProcess } from 'child_process'

type GetResult<Result> = (commandName: string, args: ReadonlyArray<string>, command: ChildProcess) => Promise<Error | Result>

export const doNothing: GetResult<null> = (cmd, args, p) => {
    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)
    return new Promise(resolve => {
        p.on("exit", (code, signal) => {
            if (code === 0) {
                resolve(null)
            } else {
                resolve(new Error(`command (${cmd} ${args.join(" ")} exits with code ${code}(${signal}`))
            }
        })
    })
}
export function getResultFromStdout<Result>(getResult: (stdout: string) => Result): GetResult<Result> {
    return (cmd, args, p) => {
        let stdout = ""
        p.stdout.on("data", data => stdout += data.toString())
        p.stderr.pipe(process.stderr)

        return new Promise(resolve => {
            p.on("exit", (code, signal) => {
                if (code === 0) {
                    resolve(getResult(stdout))
                } else {
                    resolve(new Error(`command (${cmd} ${args.join(" ")} exits with code ${code}(${signal}`))
                }
            })
        })
    }
}

export function toFunction<Result>(command: string, getResult: GetResult<Result>) {
    return (args: ReadonlyArray<string>)  => {
        const process = spawn(command, args, {shell: true})
        return getResult(command, args, process)
    }
}
