import * as chai from "chai"
chai.should()

import { Executable } from "../src/executable"

describe("Executable", () => {
    it("use the string as an executable command", async () => {
        const echo = new Executable("echo")
        const result = await echo.execute(["value"], true)
        result.stdout.should.equal("value\n")
    })
})
