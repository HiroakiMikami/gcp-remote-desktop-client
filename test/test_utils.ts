import * as chai from "chai"
import * as fs from "fs"
import * as tmp from "tmp"
chai.should()

import { backupFile, getResultFromStdout, retry, toFunction } from "../src/utils"

describe("#backupFile", () => {
    it("restore the content of file", () => {
        const tmpobj = tmp.fileSync()
        fs.writeFileSync(tmpobj.name, "foobar")
        const restore = backupFile(tmpobj.name)
        return restore.then((r) => {
            fs.writeFileSync(tmpobj.name, "")
            return r().then((_) => {
                fs.readFileSync(tmpobj.name).toString().should.equal("foobar")
            })
        })
    })
    it("delete the file when file does not exist", () => {
        const tmpobj = tmp.fileSync()
        fs.unlinkSync(tmpobj.name)
        const restore = backupFile(tmpobj.name)
        return restore.then((r) => {
            fs.writeFileSync(tmpobj.name, "")
            return r().then((_) => {
                fs.existsSync(tmpobj.name).should.equal(false)
            })
        })
    })
})

describe("#retry", () => {
    it("retry until success", () => {
        let cnt = 0
        const f = () => {
            cnt += 1
            if (cnt === 10) {
                return Promise.resolve(cnt)
            } else {
                return Promise.resolve(new Error(""))
            }
        }
        return retry<number>(f, 1000).then((result) => result.should.equal(10))
    })
    it("fail when timeout", () => {
        const f = () => {
            return Promise.resolve(new Error(""))
        }
        return retry<number>(f, 0).then((result) => (result as Error).message.should.deep.equal(""))
    })
})

describe("#toFunction", () => {
    it("use the argument as an executable command", () => {
        const f = toFunction<string>(
            "echo",
            getResultFromStdout((stdout: string) => stdout))
        return f(["value"]).then((result) => result.should.equal("value\n"))
    })
})
