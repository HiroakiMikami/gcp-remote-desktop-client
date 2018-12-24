import * as chai from "chai"
const should = chai.should()

import { Cloud } from "../src/gcp"

describe("Cloud", () => {
    describe("#createInstance", () => {
        it("create a VM and start it", () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            return gcp.createMachine("test", { machineType: "n1-highmem-4" }).then(() => {
                history.length.should.equal(2)
                history[0].should.deep.equal([
                    "beta", "compute", "instances", "create",
                    "test", "--machine-type=n1-highmem-4",
                    "--disk=name=test,device-name=test,mode=rw,boot=yes"])
                history[1].should.deep.equal(["compute", "instances", "start", "test"])
            })
        })
        it("specify a custum machine-type", () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            return gcp.createMachine("test", { machineType: { vCPU: 24, memory: 100 } }).then(() => {
                history[0].should.deep.equal([
                    "beta", "compute", "instances", "create",
                    "test", "--machine-type=custum-24-102400",
                    "--disk=name=test,device-name=test,mode=rw,boot=yes"])
            })
        })
        it("add accelerator", () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            return gcp.createMachine("test",
                                     {
                                         accelerators: [{ deviceType: "nvidia-tesla-k80", count: 1}],
                                         machineType: "n1-highmem-4",
                                    }).then(() => {
                history[0].should.deep.equal([
                    "beta", "compute", "instances", "create",
                    "test",
                    "--accelerator", "type=nvidia-tesla-k80,count=1",
                    "--machine-type=n1-highmem-4",
                    "--disk=name=test,device-name=test,mode=rw,boot=yes"])
            })
        })
        it("specify the zone", () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            return gcp.createMachine("test", { machineType: "n1-highmem-4", zone: "zone" }).then(() => {
                history[0].should.deep.equal([
                    "beta", "compute", "instances", "create",
                    "test", "--zone=zone", "--machine-type=n1-highmem-4",
                    "--disk=name=test,device-name=test,mode=rw,boot=yes"])
                history[1].should.deep.equal([
                    "compute", "instances", "start",
                    "test", "--zone=zone"])
            })
        })
    })

    describe("#getPublicIpAddress", () => {
        it("query the public IP address of the VM", () => {
            const gcp = new Cloud((args) => {
                args.should.deep.equal(["compute", "instances", "list",
                    "--filter=\"name=test\"",
                    "--format='value(networkInterfaces[0].accessConfigs[0].natIP)'"])
                return Promise.resolve("result")
            })
            return gcp.getPublicIpAddress("test", {}).then((result) => {
                result.should.equal("result")
            })
        })
        it("specify the zone", () => {
            const gcp = new Cloud((args) => {
                args.should.deep.equal(["compute", "instances", "list",
                    "--filter=\"name=test\"",
                    "--format='value(networkInterfaces[0].accessConfigs[0].natIP)'",
                    "--zones=zone"])
                return Promise.resolve("result")
            })
            return gcp.getPublicIpAddress("test", { zone: "zone" })
        })
    })

    describe("#terminateInstance", () => {
        it("stop a VM and delete it", () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            return gcp.terminateMachine("test", {}).then(() => {
                history.length.should.equal(2)
                history[0].should.deep.equal([
                    "compute", "instances", "stop",
                    "test"])
                history[1].should.deep.equal(["compute", "instances", "delete", "test"])
            })
        })
        it("specify the zone", () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            return gcp.terminateMachine("test", { zone: "zone" }).then(() => {
                history.length.should.equal(2)
                history[0].should.deep.equal([
                    "compute", "instances", "stop",
                    "--zone=zone",
                    "test"])
                history[1].should.deep.equal(["compute", "instances", "delete", "--zone=zone", "test"])
            })
        })
    })

    it("return null if the command exists", () => {
        const gcp = new Cloud(":")
        return gcp.terminateMachine("name", {}).then((error) => {
            should.not.exist(error)
        })
    })
    it("return an error if the command is not found", () => {
        const gcp = new Cloud("./not-found")
        return gcp.terminateMachine("name", {}).then((error) => {
            should.exist(error)
        })
    })
})
