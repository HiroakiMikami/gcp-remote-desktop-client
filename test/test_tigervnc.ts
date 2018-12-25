import * as chai from "chai"
const should = chai.should()

import { VncViewer } from "../src/tigervnc"

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
                                  {passwordFile: "~/.vnc/passwd", compressLevel: 0, qualityLevel: 1})
        })
        it("return null code if the command exists", () => {
            const command = new VncViewer(":")
            const retval = command.connect(5901, {})
            return retval.then((error) => {
                should.not.exist(error)
            })
        })
        it("reject with an error if the command is not found", () => {
            const command = new VncViewer("./not-found")
            const retval = command.connect(5901, {})
            let isCaught = false
            return retval.catch((error) => {
                should.exist(error)
                isCaught = true
            }).then((_) => isCaught.should.equal(true))
        })
    })
})
