import * as chai from "chai"
const should = chai.should()

import { VncViewer } from "../src/tigervnc"

describe("TigerVNC", () => {
    describe("VncViewer", () => {
        describe("#connect", () => {
            it("creates command line arguments for TigerVNC Viewer", () => {
                const command = new VncViewer((args) => {
                    args.should.deep.equal(["::5901"])
                    return Promise.resolve(null)
                })
                return command.connect(5901, {})
            })
            it("add identity file to command line arguments if options are set", () => {
                const command = new VncViewer((args) => {
                    args.should.deep.equal([
                        "-PasswordFile", "~/.vnc/passwd", "-CompressLevel", "0", "-QualityLevel", "1",
                        "::5901"])
                    return Promise.resolve(null)
                })
                return command.connect(5901,
                                    { PasswordFile: "~/.vnc/passwd", CompressLevel: 0, QualityLevel: 1 })
            })
            it("return null if the command exists", async () => {
                const command = new VncViewer(":")
                const retval = await command.connect(5901, {})
                should.not.exist(retval)
            })
            it("reject with an error if the command is not found", async () => {
                const command = new VncViewer("./not-found")

                try {
                    await command.connect(5901, {})
                } catch (err) {
                    return null
                }
                should.exist(null) // Failure
            })
        })
    })
})
