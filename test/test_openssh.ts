import * as chai from "chai";
const should = chai.should();

import { SshClient } from "../src/openssh";

describe("SshClient", () => {
    describe("#portForward", () => {
        it("creates command line arguments for SshClient", () => {
            const command = new SshClient((args) => {
                args.should.deep.equal([
                    "-o", "StrictHostKeyChecking=no", "-p", "22", "-L", "1022:localhost:8022",
                    "-l", "user", "localhost",
                ]);
                return Promise.resolve(null);
            });
            return command.portForward(22, "user", "localhost", 1022, 8022, {});
        });
        it("add identity file to command line arguments if identityFile is not null", () => {
            const command = new SshClient((args) => {
                args.should.deep.equal([
                    "-o", "StrictHostKeyChecking=no", "-p", "22", "-L", "1022:localhost:8022",
                    "-l", "user", "-i", "~/.ssh/id_rsa", "localhost",
                ]);
                return Promise.resolve(null);
            });
            return command.portForward(22, "user", "localhost", 1022, 8022,
                                       {identityFile: "~/.ssh/id_rsa" });
        });
        it("return null code if the command exists", () => {
            const command = new SshClient(":");
            const retval = command.portForward(22, "user", "localhost", 22, 8022, {});
            return retval.then((error) => {
                should.not.exist(error);
            });
        });
        it("return exit code if the command is not found", () => {
            const command = new SshClient("./not-found");
            const retval = command.portForward(22, "user", "localhost", 22, 8022, {});
            return retval.then((error) => {
                should.exist(error);
            });
        });
    });
});
