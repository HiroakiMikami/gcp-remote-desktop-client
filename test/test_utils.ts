import * as chai from "chai"
chai.should()

import { getResultFromStdout, retry, toFunction } from "../src/utils"

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
