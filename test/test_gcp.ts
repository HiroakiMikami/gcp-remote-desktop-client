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

class MockDisk {
    constructor(private history: any[][], private metadata: any) {}
    public getMetadata() {
        this.history.push(["Disk#getMetadata"])
        return Promise.resolve([this.metadata])
    }
}
class MockVM {
    constructor(private history: any[][], private metadata: any) {}
    public start() {
        this.history.push(["VM#start"])
        return [new MockOperation(this.history)]
    }
    public stop() {
        this.history.push(["VM#stop"])
        return [new MockOperation(this.history)]
    }
    public delete() {
        this.history.push(["VM#delete"])
        return [new MockOperation(this.history)]
    }
    public getMetadata() {
        this.history.push(["VM#getMetadata"])
        return Promise.resolve([this.metadata])
    }
}

class MockZone {
    constructor(private history: any[],
                private diskMetadata: ReadonlyMap<string, any>,
                private vmMetadata: ReadonlyMap<string, any>) {}
    public disk(name: string) {
        this.history.push(["Zone#disk", name])
        return new MockDisk(this.history, this.diskMetadata.get(name))
    }
    public vm(name: string ) {
        this.history.push(["Zone#vm", name])
        return new MockVM(this.history, this.vmMetadata.get(name))
    }
    public createVM(name: string, configs: any) {
        this.history.push(["Zone#createVM", name, configs])
        return Promise.resolve([
            new MockVM(this.history, this.vmMetadata.get(name)), new MockOperation(this.history),
        ])
    }
}

class MockCompute {
    constructor(private history: any[],
                private zones: ReadonlyMap<string, MockZone>) {}
    public zone(zone: string) {
        this.history.push(["Compute#zone", zone])
        return this.zones.get(zone)
    }
}

describe("GCP", () => {
    describe("Cloud", () => {
        describe("#createInstance", () => {
            it("create a VM and start it", async () => {
                const history: any[] = []
                const mockCompute = new MockCompute(history,
                    new Map([
                        ["zone", new MockZone(history,
                                              new Map([["test", { selfLink: "link" }]]),
                                              new Map([["test", {}]]),
                                             )],
                    ]))
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test", "zone", "n1-highmem-4", {})
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
                const history: any[] = []
                const mockCompute = new MockCompute(history,
                    new Map([
                        ["zone", new MockZone(history,
                                              new Map([["test", { selfLink: "link" }]]),
                                              new Map([["test", {}]]),
                                             )],
                    ]))
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test", "zone", { vCPU: 24, memory: 100 }, {})
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
                const history: any[] = []
                const mockCompute = new MockCompute(history,
                    new Map([
                        ["zone", new MockZone(history,
                                              new Map([["test", { selfLink: "link" }]]),
                                              new Map([["test", {}]]),
                                             )],
                    ]))
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test", "zone", "n1-highmem-4",
                                        { accelerators: [{ deviceType: "nvidia-tesla-k80", count: 1}] })
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
                const history: any[] = []
                const mockCompute = new MockCompute(history,
                    new Map([
                        ["zone", new MockZone(history,
                                              new Map([["test", { selfLink: "link" }]]),
                                              new Map([["test", {}]]),
                                             )],
                    ]))
                const gcp = new Cloud(mockCompute)
                await gcp.createMachine("test", "test", "zone", "n1-highmem-4",
                                        { tags: ["foo", "bar"] })
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
                const history: any[] = []
                const mockCompute = new MockCompute(history,
                    new Map([
                        ["zone", new MockZone(history,
                                              new Map(),
                                              new Map([["test", {
                                                  networkInterfaces: [{
                                                    accessConfigs: [{ natIP: "result" }],
                                                  }],
                                              }]]),
                                             )],
                    ]))
                const gcp = new Cloud(mockCompute)
                const result = await gcp.getPublicIpAddress("test", "zone")
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
                const history: any[] = []
                const mockCompute = new MockCompute(history,
                    new Map([
                        ["zone", new MockZone(history,
                                              new Map(),
                                              new Map([["test", {}]]))]]))
                const gcp = new Cloud(mockCompute)
                await gcp.terminateMachine("test", "zone")
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
