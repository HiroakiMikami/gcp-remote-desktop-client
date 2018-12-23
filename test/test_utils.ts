import * as chai from "chai"
chai.should()

import { getResultFromStdout, toFunction } from "../src/utils"

describe("#toFunction", () => {
    it("use the argument as an executable command", () => {
        const f = toFunction<string>(
            "echo",
            getResultFromStdout((stdout: string) => stdout))
        return f(["value"]).then((result) => result.should.equal("value\n"))
    })
})
