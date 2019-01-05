import * as chai from "chai"
chai.should()

import { Cloud } from "../src/gcp"

class MockOperation {
    constructor(private history: any[][]) {}
    public promise() {
        this.history.push(["Operation#promise"])
        return Promise.resolve()
    }
}

describe("GCP", () => {
    describe("Cloud", () => {
        describe("#createInstance", () => {
            it("create a VM and start it", async () => {
                const history: any[][] = []
                const mockCompute = {
                    zone(zone: string) {
                        history.push(["Compute#zone", zone])
                        return {
                            disk(name: string) {
                                history.push(["Zone#disk", name])
                                return {
                                    getMetadata() {
                                        history.push(["Disk#getMetadata"])
                                        return Promise.resolve([{ selfLink: "link" }])
                                    },
                                }
                            },
                            createVM(name: string, configs: any) {
                                history.push(["Zone#createVM", name, configs])
                                return Promise.resolve([
                                    {
                                        start() {
                                            history.push(["VM#start"])
                                            return [new MockOperation(history)]
                                        },
                                    },
                                    new MockOperation(history),
                                ])
                            },
                        }
                    },
                }
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test", { zone: "zone", machineType: "n1-highmem-4" })
                history.should.deep.equal([
                    ["Compute#zone", "zone"],
                    ["Zone#disk", "test"],
                    ["Disk#getMetadata"],
                    ["Zone#createVM", "test", {
                        disks: [{
                            autoDelete: false,
                            boot: true,
                            deviceName: "test",
                            kind: "compute#attachedDisk",
                            mode: "READ_WRITE",
                            source: "link",
                            type: "PERSISTENT",
                        }],
                        guestAccelerators: [],
                        machineType: "n1-highmem-4",
            networkInterfaces: [
                {
                    accessConfigs: [{
                        kind: "compute#accessConfig",
                        name: "External NAT",
                        networkTier: "PREMIUM",
                        type: "ONE_TO_ONE_NAT",
                    }],
                    aliasIpRanges: [],
                    kind: "compute#networkInterface",
                },
            ],
                        scheduling: {
                            automaticRestart: false,
                            onHostMaintenance: "TERMINATE",
                            preemptible: false,
                        },
                        tags: [],
                    }],
                    ["Operation#promise"],
                    ["VM#start"],
                    ["Operation#promise"],
                ])
            })
            it("specify a custum machine-type", async () => {
                const history: any[][] = []
                const mockCompute = {
                    zone(zone: string) {
                        history.push(["Compute#zone", zone])
                        return {
                            disk(name: string) {
                                history.push(["Zone#disk", name])
                                return {
                                    getMetadata() {
                                        history.push(["Disk#getMetadata"])
                                        return Promise.resolve([{ selfLink: "link" }])
                                    },
                                }
                            },
                            createVM(name: string, configs: any) {
                                history.push(["Zone#createVM", name, configs])
                                return Promise.resolve([
                                    {
                                        start() {
                                            history.push(["VM#start"])
                                            return [new MockOperation(history)]
                                        },
                                    },
                                    new MockOperation(history),
                                ])
                            },
                        }
                    },
                }
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test", { zone: "zone", machineType: { vCPU: 24, memory: 100 } })
                history.should.deep.equal([
                    ["Compute#zone", "zone"],
                    ["Zone#disk", "test"],
                    ["Disk#getMetadata"],
                    ["Zone#createVM", "test", {
                        disks: [{
                            autoDelete: false,
                            boot: true,
                            deviceName: "test",
                            kind: "compute#attachedDisk",
                            mode: "READ_WRITE",
                            source: "link",
                            type: "PERSISTENT",
                        }],
                        guestAccelerators: [],
                        machineType: "custum-24-102400",
            networkInterfaces: [
                {
                    accessConfigs: [{
                        kind: "compute#accessConfig",
                        name: "External NAT",
                        networkTier: "PREMIUM",
                        type: "ONE_TO_ONE_NAT",
                    }],
                    aliasIpRanges: [],
                    kind: "compute#networkInterface",
                },
            ],
                        scheduling: {
                            automaticRestart: false,
                            onHostMaintenance: "TERMINATE",
                            preemptible: false,
                        },
                        tags: [],
                    }],
                    ["Operation#promise"],
                    ["VM#start"],
                    ["Operation#promise"],
                ])
            })
            it("add accelerator", async () => {
                const history: any[][] = []
                const mockCompute = {
                    zone(zone: string) {
                        history.push(["Compute#zone", zone])
                        return {
                            disk(name: string) {
                                history.push(["Zone#disk", name])
                                return {
                                    getMetadata() {
                                        history.push(["Disk#getMetadata"])
                                        return Promise.resolve([{ selfLink: "link" }])
                                    },
                                }
                            },
                            createVM(name: string, configs: any) {
                                history.push(["Zone#createVM", name, configs])
                                return Promise.resolve([
                                    {
                                        start() {
                                            history.push(["VM#start"])
                                            return [new MockOperation(history)]
                                        },
                                    },
                                    new MockOperation(history),
                                ])
                            },
                        }
                    },
                }
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test",
                                        {
                                            accelerators: [{ deviceType: "nvidia-tesla-k80", count: 1}],
                                            machineType: "n1-highmem-4",
                                            zone: "zone",
                                        })
                history.should.deep.equal([
                    ["Compute#zone", "zone"],
                    ["Zone#disk", "test"],
                    ["Disk#getMetadata"],
                    ["Zone#createVM", "test", {
                        disks: [{
                            autoDelete: false,
                            boot: true,
                            deviceName: "test",
                            kind: "compute#attachedDisk",
                            mode: "READ_WRITE",
                            source: "link",
                            type: "PERSISTENT",
                        }],
                        guestAccelerators: [{ acceleratorType: "nvidia-tesla-k80", acceleratorCount: 1 }],
                        machineType: "n1-highmem-4",
            networkInterfaces: [
                {
                    accessConfigs: [{
                        kind: "compute#accessConfig",
                        name: "External NAT",
                        networkTier: "PREMIUM",
                        type: "ONE_TO_ONE_NAT",
                    }],
                    aliasIpRanges: [],
                    kind: "compute#networkInterface",
                },
            ],
                        scheduling: {
                            automaticRestart: false,
                            onHostMaintenance: "TERMINATE",
                            preemptible: false,
                        },
                        tags: [],
                    }],
                    ["Operation#promise"],
                    ["VM#start"],
                    ["Operation#promise"],
                ])
            })
            it("specify the tags", async () => {
                const history: any[][] = []
                const mockCompute = {
                    zone(zone: string) {
                        history.push(["Compute#zone", zone])
                        return {
                            disk(name: string) {
                                history.push(["Zone#disk", name])
                                return {
                                    getMetadata() {
                                        history.push(["Disk#getMetadata"])
                                        return Promise.resolve([{ selfLink: "link" }])
                                    },
                                }
                            },
                            createVM(name: string, configs: any) {
                                history.push(["Zone#createVM", name, configs])
                                return Promise.resolve([
                                    {
                                        start() {
                                            history.push(["VM#start"])
                                            return [new MockOperation(history)]
                                        },
                                    },
                                    new MockOperation(history),
                                ])
                            },
                        }
                    },
                }
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test",
                                        { zone: "zone", machineType: "n1-highmem-4", tags: ["foo", "bar"] })
                history.should.deep.equal([
                    ["Compute#zone", "zone"],
                    ["Zone#disk", "test"],
                    ["Disk#getMetadata"],
                    ["Zone#createVM", "test", {
                        disks: [{
                            autoDelete: false,
                            boot: true,
                            deviceName: "test",
                            kind: "compute#attachedDisk",
                            mode: "READ_WRITE",
                            source: "link",
                            type: "PERSISTENT",
                        }],
                        guestAccelerators: [],
                        machineType: "n1-highmem-4",
            networkInterfaces: [
                {
                    accessConfigs: [{
                        kind: "compute#accessConfig",
                        name: "External NAT",
                        networkTier: "PREMIUM",
                        type: "ONE_TO_ONE_NAT",
                    }],
                    aliasIpRanges: [],
                    kind: "compute#networkInterface",
                },
            ],
                        scheduling: {
                            automaticRestart: false,
                            onHostMaintenance: "TERMINATE",
                            preemptible: false,
                        },
                        tags: ["foo", "bar"],
                    }],
                    ["Operation#promise"],
                    ["VM#start"],
                    ["Operation#promise"],
                ])
            })
        })

        describe("#getPublicIpAddress", () => {
            it("query the public IP address of the VM", async () => {
                const history: any[][] = []
                const mockCompute = {
                    zone(zone: string) {
                        history.push(["Compute#zone", zone])
                        return {
                            vm(name: string) {
                                history.push(["Zone#vm", name])
                                return {
                                    getMetadata() {
                                        history.push(["VM#getMetadata"])
                                        return Promise.resolve([{
                                            networkInterfaces: [{
                                                accessConfigs: [{ natIP: "result" }],
                                            }],
                                        }])
                                    },
                                }
                            },
                        }
                    },
                }
                const gcp = new Cloud(mockCompute)
                const result = await gcp.getPublicIpAddress("test", {zone: "zone"})
                result.should.equal("result")
                history.should.deep.equal([
                    ["Compute#zone", "zone"],
                    ["Zone#vm", "test"],
                    ["VM#getMetadata"],
                ])
            })
        })

        describe("#terminateInstance", () => {
            it("stop a VM and delete it", async () => {
                const history: any[][] = []
                const mockCompute = {
                    zone(zone: string) {
                        history.push(["Compute#zone", zone])
                        return {
                            vm(name: string) {
                                history.push(["Zone#vm", name])
                                return {
                                    stop() {
                                        history.push(["VM#stop"])
                                        return Promise.resolve([new MockOperation(history)])
                                    },
                                    delete() {
                                        history.push(["VM#delete"])
                                        return Promise.resolve([new MockOperation(history)])
                                    },
                                }
                            },
                        }
                    },
                }
                const gcp = new Cloud(mockCompute)
                await gcp.terminateMachine("test", {zone: "zone"})
                history.should.deep.equal([
                    ["Compute#zone", "zone"],
                    ["Zone#vm", "test"],
                    ["VM#stop"],
                    ["Operation#promise"],
                    ["VM#delete"],
                    ["Operation#promise"],
                ])
            })
        })
    })
})
