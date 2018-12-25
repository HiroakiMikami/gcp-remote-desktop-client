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
                        "-o", "StrictHostKeyChecking=no", "-fNT", "-p", "22", "-L", "8022:localhost:1022",
                        "-l", "user", "localhost",
                    ])
                    return Promise.resolve(null)
                })
                return command.portForward(22, "user", "localhost", 1022, 8022, {})
            })
            it("add identity file to command line arguments if identityFile is not null", () => {
                const command = new SshClient((args) => {
                    args.should.deep.equal([
                        "-o", "StrictHostKeyChecking=no", "-fNT", "-p", "22", "-L", "8022:localhost:1022",
                        "-l", "user", "-i", "~/.ssh/id_rsa", "localhost",
                    ])
                    return Promise.resolve(null)
                })
                return command.portForward(22, "user", "localhost", 1022, 8022,
                                        {identityFile: "~/.ssh/id_rsa" })
            })
            it("return onexit function if the command exists", async () => {
                const command = new SshClient(":")
                const onexit = await command.portForward(22, "user", "localhost", 22, 8022, {});
                `${typeof(onexit)}`.toString().should.equal("function")
            })
            it("reject with an error if the command is not found", async () => {
                const command = new SshClient("./not-found")

                try {
                    await command.portForward(22, "user", "localhost", 22, 8022, {})
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
                }, 0, tmpFile.name)
                const onexit = await command.portForward(22, "user", "localhost", 1022, 8022, {})
                await onexit()
                fs.readFileSync(tmpFile.name).toString().should.equal("original")
            })
        })
    })
})
