import * as chai from "chai"
import * as fs from "fs"
import * as tmp from "tmp"
const should = chai.should()

import { backupFile, retry, toFunction } from "../src/utils"

describe("#backupFile", () => {
    it("restore the content of file", async () => {
        const tmpobj = tmp.fileSync()
        fs.writeFileSync(tmpobj.name, "foobar")
        const restore = await backupFile(tmpobj.name)
        fs.writeFileSync(tmpobj.name, "")
        await restore()
        fs.readFileSync(tmpobj.name).toString().should.equal("foobar")
    })
    it("delete the file when file does not exist", async () => {
        const tmpobj = tmp.fileSync()
        fs.unlinkSync(tmpobj.name)
        const restore = await backupFile(tmpobj.name)
        fs.writeFileSync(tmpobj.name, "")
        await restore()
        fs.existsSync(tmpobj.name).should.equal(false)
    })
})

describe("#retry", () => {
    it("retry until success", async () => {
        let cnt = 0
        const f = () => {
            cnt += 1
            if (cnt === 10) {
                return Promise.resolve(cnt)
            } else {
                return Promise.reject(new Error(""))
            }
        }
        const result = await retry<number>(f, 1000)
        result.should.equal(10)
    })
    it("fail when timeout", async () => {
        const f = () => Promise.reject(new Error(""))
        try {
            await retry<number>(f, 0)
        } catch (err) {
            return null
        }
        should.exist(null) // Failure
    })
})

describe("#toFunction", () => {
    it("use the argument as an executable command", async () => {
        const f = toFunction("echo", (stdout) => stdout, true)
        const result = await f(["value"])
        result.should.equal("value\n")
    })
})
