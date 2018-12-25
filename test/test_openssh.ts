import * as chai from "chai"
const should = chai.should()
import * as fs from "fs"
import * as tmp from "tmp"

import { SshClient } from "../src/openssh"
import { OnExit } from "../src/ssh_client"

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
        it("return onexit function if the command exists", () => {
            const command = new SshClient(":")
            const retval = command.portForward(22, "user", "localhost", 22, 8022, {})
            return retval.then((onexit) => {
                (`${typeof(onexit)}`).toString().should.equal("function")
            })
        })
        it("reject with an error if the command is not found", () => {
            const command = new SshClient("./not-found")
            const retval = command.portForward(22, "user", "localhost", 22, 8022, {})
            let isCaught = false
            return retval.catch((error) => {
                should.exist(error)
                isCaught = true
            }).then((_) => isCaught.should.equal(true))
        })
        it("backup known_hosts file", () => {
            const tmpFile = tmp.fileSync()
            fs.writeFileSync(tmpFile.name, "original")
            const command = new SshClient((_) => {
                fs.writeFileSync(tmpFile.name, "foobar")

                return Promise.resolve(null)
            }, 0, tmpFile.name)
            return command.portForward(22, "user", "localhost", 1022, 8022, {}).then((onexit) => {
                return (onexit as OnExit)()
            }).then((_) => {
                fs.readFileSync(tmpFile.name).toString().should.equal("original")
            })
        })
    })
})
