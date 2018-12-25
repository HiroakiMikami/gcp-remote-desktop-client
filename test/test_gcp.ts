import * as chai from "chai"
const should = chai.should()

import { Cloud } from "../src/gcp"

describe("Cloud", () => {
    describe("#createInstance", () => {
        it("create a VM and start it", async () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            await gcp.createMachine("test", { machineType: "n1-highmem-4" })
            history.length.should.equal(2)
            history[0].should.deep.equal([
                "beta", "compute", "instances", "create",
                "test", "--machine-type=n1-highmem-4",
                "--disk=name=test,device-name=test,mode=rw,boot=yes"])
            history[1].should.deep.equal(["compute", "instances", "start", "test"])
        })
        it("specify a custum machine-type", async () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            await gcp.createMachine("test", { machineType: { vCPU: 24, memory: 100 } })
            history[0].should.deep.equal([
                "beta", "compute", "instances", "create",
                "test", "--machine-type=custum-24-102400",
                "--disk=name=test,device-name=test,mode=rw,boot=yes"])
        })
        it("add accelerator", async () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            await gcp.createMachine("test",
                                    {
                                        accelerators: [{ deviceType: "nvidia-tesla-k80", count: 1}],
                                        machineType: "n1-highmem-4",
                                    })
            history[0].should.deep.equal([
                "beta", "compute", "instances", "create",
                "test",
                "--accelerator", "type=nvidia-tesla-k80,count=1",
                "--machine-type=n1-highmem-4",
                "--disk=name=test,device-name=test,mode=rw,boot=yes"])
        })
        it("specify the tags", async () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            await gcp.createMachine("test", { machineType: "n1-highmem-4", tags: ["foo", "bar"] })
            history[0].should.deep.equal([
                "beta", "compute", "instances", "create",
                "test", "--tags=foo,bar", "--machine-type=n1-highmem-4",
                "--disk=name=test,device-name=test,mode=rw,boot=yes"])
        })
        it("specify the zone", async () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            await gcp.createMachine("test", { machineType: "n1-highmem-4", zone: "zone" })
            history[0].should.deep.equal([
                "beta", "compute", "instances", "create",
                "test", "--zone=zone", "--machine-type=n1-highmem-4",
                "--disk=name=test,device-name=test,mode=rw,boot=yes"])
            history[1].should.deep.equal([
                "compute", "instances", "start",
                "test", "--zone=zone"])
        })
    })

    describe("#getPublicIpAddress", () => {
        it("query the public IP address of the VM", async () => {
            const gcp = new Cloud((args) => {
                args.should.deep.equal(["compute", "instances", "list",
                    "--filter=\"name=test\"",
                    "--format='value(networkInterfaces[0].accessConfigs[0].natIP)'"])
                return Promise.resolve("result")
            })
            const result = await gcp.getPublicIpAddress("test", {})
            result.should.equal("result")
        })
        it("specify the zone", async () => {
            const gcp = new Cloud((args) => {
                args.should.deep.equal(["compute", "instances", "list",
                    "--filter=\"name=test\"",
                    "--format='value(networkInterfaces[0].accessConfigs[0].natIP)'",
                    "--zones=zone"])
                return Promise.resolve("result")
            })
            await gcp.getPublicIpAddress("test", { zone: "zone" })
        })
    })

    describe("#terminateInstance", () => {
        it("stop a VM and delete it", async () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            await gcp.terminateMachine("test", {})
            history.length.should.equal(2)
            history[0].should.deep.equal([
                "compute", "instances", "stop",
                "test"])
            history[1].should.deep.equal(["--quiet", "compute", "instances", "delete",
                "--keep-disks", "all", "test"])
        })
        it("specify the zone", async () => {
            const history: Array<{}> = []
            const gcp = new Cloud((args) => {
                history.push(args)
                return Promise.resolve("result")
            })
            await gcp.terminateMachine("test", { zone: "zone" })
            history.length.should.equal(2)
            history[0].should.deep.equal([
                "compute", "instances", "stop",
                "--zone=zone",
                "test"])
            history[1].should.deep.equal(["--quiet", "compute", "instances", "delete",
                "--keep-disks", "all", "--zone=zone", "test"])
        })
    })

    it("return null if the command exists", async () => {
        const gcp = new Cloud(":")
        const error = await gcp.terminateMachine("name", {})
        should.not.exist(error)
    })
    it("reject with an error if the command is not found", async () => {
        const gcp = new Cloud("./not-found")

        try {
            await gcp.terminateMachine("name", {})
        } catch (err) {
            return null
        }
        should.exist(null) // Failure  let isCaught = false
    })
})
