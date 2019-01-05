import * as Compute from "@google-cloud/compute"
import { Command } from "commander"
import * as log4js from "log4js"
import { isString } from "util"
import { Configurations } from "./configurations"

const logger = log4js.getLogger()

function zoneToRegion(zone: string) {
    const i = zone.lastIndexOf("-")
    if (i === -1) {
        return zone
    }
    return zone.substr(0, i)
}

function createDiskType(apiUrl: string, project: string, zone: string, diskType: string) {
    return `${apiUrl}/projects/${project}/zones/${zone}/diskTypes/${diskType}`
}

function parseDiskType(apiUrl: string, url: string) {
    if (!url.startsWith(apiUrl)) {
        throw new Error(`Invalid disk type: ${url}`)
    }
    const tokens = url.split("/")
    return {
        diskType: tokens[tokens.indexOf("diskTypes") + 1],
        project: tokens[tokens.indexOf("projects") + 1],
        zone: tokens[tokens.indexOf("zones") + 1],
    }
}
export interface ICustumMachineType {
    /** required the number of CPUs */
    vCPU: number
    /** required memory size [GB] */
    memory: number
}

export interface IAccelerator {
    deviceType: string
    count: number
}

export interface ILabelOptions {
    diskNameLabelName: string,
    projectLabelName: string,
    diskTypeLabelName: string
}

export interface ICreateMachineOptions {
    accelerators?: ReadonlyArray<IAccelerator>
    preemptible?: boolean
    tags?: ReadonlyArray<string>
}

function compareSnapshotWithMetadata(a: [any, any], b: [any, any]) {
    const aTimestamp = Date.parse(a[1].creationTimestamp)
    const bTimestamp = Date.parse(b[1].creationTimestamp)
    if (aTimestamp < bTimestamp) {
    // a is older than b
        return -1
    } else if (aTimestamp > bTimestamp) {
    // a is newer than b
        return 1
    } else {
        return 0
    }
}

export class Cloud {
    constructor(private compute: Compute = new Compute(), private apiUrl= "https://www.googleapis.com/compute/v1") {}
    public async prepareDisk(diskName: string, zone: string, options: ILabelOptions): Promise<null> {
        const disk = this.compute.zone(zone).disk(diskName)

        const tmpExists = await disk.exists()
        const exists = tmpExists[0]
        if (!exists) {
            logger.info(`Restore a disk from the snapshot because the disk does not exist`)
            const tmpSnaphots = await this.compute.getSnapshots(
                { filter: `labels.${options.diskNameLabelName}="${zone}_${diskName}"` })
            const snapshots: any[] = tmpSnaphots[0]

            let snapshotsWithMetadata: Array<[any, any]> = await Promise.all(
                snapshots.map(async (s) => {
                    const data = await s.getMetadata()
                    return [s, data[0]] as [any, any]
                }),
            )
            snapshotsWithMetadata = snapshotsWithMetadata.sort(compareSnapshotWithMetadata)

            if (snapshotsWithMetadata.length === 0) {
                throw new Error(`There is no snapshots correspoinding to ${diskName} in ${zone}`)
            }
            const [snapshot, metadata] = snapshotsWithMetadata[snapshotsWithMetadata.length - 1]
            logger.debug(`The newest snapshot: ${snapshot.name}`)

            const type = metadata.labels[options.diskTypeLabelName]
            const project = metadata.labels[options.projectLabelName]
            const configs = {
                sizeGb: metadata.diskSizeGb,
                sourceSnapshot: metadata.selfLink,
                type: createDiskType(this.apiUrl, project, zone, type),
            }
            logger.debug(`Create disk from the snapshot: ${JSON.stringify(configs)}`)
            const op = await disk.create(configs)
            await op[1].promise()
        }

        return null
    }
    public async createSnapshot(diskName: string, snapshotName: string, zone: string,
                                options: ILabelOptions): Promise<null> {
        const labels = {}
        labels[options.diskNameLabelName] = `${zone}_${diskName}`
        const disk = this.compute
            .zone(zone)
            .disk(diskName)

        const [diskMetadata] = await disk.getMetadata()
        const type = parseDiskType(this.apiUrl, diskMetadata.type)
        labels[options.projectLabelName] = type.project
        labels[options.diskTypeLabelName] = type.diskType

        logger.info(`Create ${snapshotName} snapshot`)
        const configs = { labels, storageLocations: [zoneToRegion(zone)] }
        logger.debug(`configs: ${JSON.stringify(configs)}`)
        const op = await disk.createSnapshot(snapshotName, configs)
        await op[1].promise()

        return null
    }
    public async createMachine(machineName: string, diskName: string, zone: string,
                               machineType: string | ICustumMachineType,
                               options: ICreateMachineOptions): Promise<null> {
        let machineTypeStr = ""
        if (isString(machineType)) {
            machineTypeStr = machineType
        } else {
            const tmp = machineType
            machineTypeStr = `custum-${tmp.vCPU}-${tmp.memory * 1024}`
        }
        const accelerators = []
        for (const a of options.accelerators || []) {
            accelerators.push({ acceleratorType: a.deviceType, acceleratorCount: a.count })
        }
        let preemptible = options.preemptible
        if (preemptible === undefined) {
            preemptible = false
        }

        const zoneObj = this.compute.zone(zone)
        const disk = zoneObj.disk(diskName)
        const tmpDiskMetadata = await disk.getMetadata()
        const diskMetadata = tmpDiskMetadata[0]
        const configs = {
            disks: [{
                autoDelete: false,
                boot: true,
                deviceName: diskName,
                kind: "compute#attachedDisk",
                mode: "READ_WRITE",
                source: diskMetadata.selfLink,
                type: "PERSISTENT",
            }],
            guestAccelerators: accelerators,
            machineType: machineTypeStr,
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
                preemptible,
            },
            tags: options.tags || [],
        }

        logger.info(`Create VM(name="${machineName}")`)
        logger.debug(`Configuration: ${JSON.stringify(configs)}`)
        const tmpVm = await zoneObj.createVM(machineName, configs)
        const vm = tmpVm[0]
        await tmpVm[1].promise() // Wait for VM

        logger.info(`Start VM(name="${machineName}")`)
        const op = await vm.start()
        await op[0].promise()

        return null
    }
    public async getPublicIpAddress(machineName: string, zone: string): Promise<string> {
        const vm = this.compute.zone(zone).vm(machineName)
        const tmpVmMetadata = await vm.getMetadata()
        const vmMetadata = tmpVmMetadata[0]
        return vmMetadata.networkInterfaces[0].accessConfigs[0].natIP
    }
    public async terminateMachine(machineName: string, zone: string): Promise<null> {
        const vm = this.compute.zone(zone).vm(machineName)

        logger.info(`Stop VM(name="${machineName}")`)
        const op1 = await vm.stop()
        await op1[0].promise()

        logger.info(`Delete VM(name="${machineName}")`)
        const op2 = await vm.delete()
        await op2[0].promise()

        return null
    }
}

function parseAccelerator(value: string, _: ReadonlyArray<IAccelerator>) {
    const accelerators = []
    try {
        const xs = value.split(",")
        for (const x of xs) {
            if (x.length === 0) { continue }
            const [type, count] = x.split("=")
            accelerators.push({ deviceType: type, count: parseInt(count, 10) })
        }
    } catch (error) {
        return error
    }
    return accelerators
}

function parseTags(value: string, _: ReadonlyArray<string>) {
    return value.split(",")
}

export function buildCloud(command: Command, configs: Configurations) {
    let preemptible = configs.preemptible
    if (preemptible === undefined) {
        preemptible = false
    }
    command
        .option("--machine-type <machine_type>", "The machine type", configs["machine-type"])
        .option("--vcpu <n>", "The number of CPUs", configs.vcpu)
        .option("--memory <n>", "The required memory [GB]", configs.memory)
        .option("--accelerator [type=count,...]", "The accelerator", parseAccelerator, configs.accelerator || [])
    if (preemptible) {
        command
            .option("--no-preemptible", `Not use preemptible VM (default=${preemptible})`, preemptible)
    } else {
        command
            .option("--preemptible", `Use preemptible VM (default=${preemptible})`, preemptible)
    }
    command
        .option("--tags <tag1>[,<tag2>...]", "The network tags", parseTags, configs.tags)
        .option("--zone <zone>", "The zone", configs.zone)
        .option("--snapshot-label-prefix <prefix>", "The prefix of labels",
                configs["snapshot-label-prefix"] || "gcp-remote-desktop-client")
    return () => {
        const cloud = new Cloud()
        const labelOptions = {
            diskNameLabelName: `${command.snapshotLabelPrefix}__name`,
            diskTypeLabelName: `${command.snapshotLabelPrefix}__disk-type`,
            projectLabelName: `${command.snapshotLabelPrefix}__project`,
        }
        return {
            async createMachine(machineName: string, diskName: string): Promise<null> {
                /* Get machine type */
                let machineType: string | ICustumMachineType | null = null
                if (command.machineType !== undefined) {
                    machineType = command.machineType
                } else if (command.vcpu !== undefined && command.memory !== undefined) {
                    machineType = { vCPU: command.vcpu, memory: command.memory }
                } else {
                    return Promise.reject(new Error("No machine type is specified"))
                }

                /* Get accerelator */
                const accelerators = command.accelerator
                if (accelerators instanceof Error) {
                    return Promise.reject(accelerators)
                }

                await cloud.prepareDisk(diskName, command.zone, labelOptions)
                await cloud.createMachine(machineName, diskName, command.zone, machineType, {
                    accelerators,
                    preemptible: command.preemptible,
                    tags: command.tags,
                })

                return null
            },
            getPublicIpAddress(name: string): Promise<string> {
                return cloud.getPublicIpAddress(name, command.zone)
            },
            async terminateMachine(machineName: string, diskName: string, snapshotName: string): Promise<null> {
                await cloud.terminateMachine(machineName, command.zone)
                await cloud.createSnapshot(diskName, snapshotName, command.zone, labelOptions)

                return null
            },
        }
    }
}
