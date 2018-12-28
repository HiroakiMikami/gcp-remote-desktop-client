import * as chai from "chai"
const should = chai.should()
import * as fs from "fs"
import * as tmp from "tmp"

import { SshClient } from "../src/openssh"
describe("OpenSSH", () => {
    describe("SshClient", () => {
        describe("#portForward", () => {
            it("creates command line arguments for SshClient", () => {
                const command = new SshClient((args) => {
                    args.should.deep.equal([
                        "-o", "StrictHostKeyChecking=no", "-fNT", "-L", "8022:localhost:1022", "-p", "22",
                        "-l", "user", "localhost",
                    ])
                    return Promise.resolve(null)
                })
                return command.portForward("localhost", 1022, 8022, { p: 22, l: "user" })
            })
            it("return onexit function if the command exists", async () => {
                const command = new SshClient(":")
                const onexit = await command.portForward("localhost", 22, 8022, { p: 22, l: "user" });
                `${typeof(onexit)}`.toString().should.equal("function")
            })
            it("reject with an error if the command is not found", async () => {
                const command = new SshClient("./not-found")

                try {
                    await command.portForward("localhost", 22, 8022, {})
                } catch (err) {
                    return null
                }
                should.exist(null) // Failure
            })
            it("backup known_hosts file", async () => {
                const tmpFile = tmp.fileSync()
                fs.writeFileSync(tmpFile.name, "original")
                const command = new SshClient((_) => {
                    fs.writeFileSync(tmpFile.name, "foobar")

                    return Promise.resolve(null)
                }, 0, 0, tmpFile.name)
                const onexit = await command.portForward("localhost", 1022, 8022, { p: 22, l: "user" })
                await onexit()
                fs.readFileSync(tmpFile.name).toString().should.equal("original")
            })
        })
    })
})
