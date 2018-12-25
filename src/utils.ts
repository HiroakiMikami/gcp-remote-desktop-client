import * as fs from "fs"
import * as log4js from "log4js"
import * as util from "util"
const logger = log4js.getLogger()

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
        logger.debug(`Read file: ${path}`)
        originalFile = (await readFile(path)).toString()
    } else {
        logger.debug(`file does nto exist: ${path}`)
    }

    return async () => {
        if (originalFile === null) {
            logger.debug(`Delete ${path} because it did not exist when backuping`)
            await unlink(path)
            return null
        } else {
            logger.debug(`Restore ${path}`)
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
            logger.debug(`Failed with ${err}, retry`)
            const next = procedure()
            return execute(next)
        })
    }
    return execute(procedure())
}
