import { Command } from "commander"
import { ICloud, ICloudBuilder } from "./cloud"
import { doNothing, getResultFromStdout, toFunction } from "./utils"

export interface IOptions {
    zone?: string
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

export interface ICreateMachineOptions extends IOptions {
    machineType: string | ICustumMachineType,
    accelerators?: ReadonlyArray<IAccelerator>
    preemptible?: boolean
    tags?: ReadonlyArray<string>
}

type GcloudCommandWithStdout = (options: ReadonlyArray<string>) => Promise<string>

export class Cloud implements ICloud<ICreateMachineOptions, IOptions, IOptions> {
    private gcloudCommand: (options: ReadonlyArray<string>) => Promise<null>
    private gcloudCommandWithStdout: (options: ReadonlyArray<string>) => Promise<string>
    constructor(gcloudCommand: string | GcloudCommandWithStdout = "gcloud") {
        if (typeof(gcloudCommand) === "string") {
            this.gcloudCommand = toFunction(gcloudCommand, doNothing)
            this.gcloudCommandWithStdout = toFunction(gcloudCommand, getResultFromStdout((stdout) => stdout))
        } else {
            this.gcloudCommand = async (args) => {
                await gcloudCommand(args)
                return null
            }
            this.gcloudCommandWithStdout = gcloudCommand
        }
    }
    public async createMachine(name: string, options: ICreateMachineOptions): Promise<null> {
        const createArgs = ["beta", "compute", "instances", "create", name]
        const startArgs = ["compute", "instances", "start", name]
        if (options.zone !== undefined) {
            createArgs.push(`--zone=${options.zone}`)
            startArgs.push(`--zone=${options.zone}`)
        }
        let machineType = ""
        if (typeof(options.machineType) === "string") {
            machineType = options.machineType as string /* TODO */
        } else {
            const tmp = options.machineType as ICustumMachineType
            machineType = `custum-${tmp.vCPU}-${tmp.memory * 1024}`
        }
        if (options.accelerators !== undefined && options.accelerators.length !== 0) {
            for (const accelerator of options.accelerators) {
                createArgs.push("--accelerator")
                createArgs.push(`type=${accelerator.deviceType},count=${accelerator.count}`)
            }
        }

        if (options.tags !== undefined && options.tags.length !== 0) {
            createArgs.push(`--tags=${options.tags.join(",")}`)
        }

        if (options.preemptible) {
            createArgs.push("--preemptible")
        }
        createArgs.push(`--machine-type=${machineType}`)
        createArgs.push(`--disk=name=${name},device-name=${name},mode=rw,boot=yes`)

        await this.gcloudCommand(createArgs)
        await this.gcloudCommand(startArgs)
        return null
    }
    public async getPublicIpAddress(name: string, options: IOptions): Promise<string> {
        const args = ["compute", "instances", "list",
                    `--filter="name=${name}"`,
                    "--format='value(networkInterfaces[0].accessConfigs[0].natIP)'"]
        if (options.zone !== undefined) {
            args.push(`--zones=${options.zone}`)
        }
        const result = await this.gcloudCommandWithStdout(args)
        return result.split("\n")[0]
    }
    public async terminateMachine(name: string, options: IOptions): Promise<null> {
        const stopArgs = ["compute", "instances", "stop"]
        const deleteArgs = ["--quiet", "compute", "instances", "delete", "--keep-disks", "all"]
        if (options.zone !== undefined) {
            stopArgs.push(`--zone=${options.zone}`)
            deleteArgs.push(`--zone=${options.zone}`)
        }
        stopArgs.push(name)
        deleteArgs.push(name)
        await this.gcloudCommand(stopArgs)
        await this.gcloudCommand(deleteArgs)
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

export class CloudBuilder implements ICloudBuilder {
    public commandLineArguments(command: Command): Command {
        return command
            .option("--gcloud-path <command>", "The path of `gcloud` command", "gcloud")
            .option("--machine-type <machine_type>", "The machine type", undefined)
            .option("--vcpu <n>", "The number of CPUs", undefined)
            .option("--memory <n>", "The required memory [GB]", undefined)
            .option("--accelerator [type=count,...]", "The accelerator", parseAccelerator, [])
            .option("--preemptible", "Use preemptible VM", false)
            .option("--tags <tag1>[,<tag2>...]", "The network tags", parseTags, [])
            .option("--zone <zone>", "The zone", undefined)
    }
    public create(command: Command): ICloud<void, void, void> {
        const cloud = new Cloud(command.gclouPath)
        return {
            createMachine(name: string, _: void): Promise<null> {
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
                return cloud.createMachine(name, {
                    accelerators,
                    machineType,
                    preemptible: command.preemptible,
                    tags: command.tags,
                    zone: command.zone,
                })
            },
            getPublicIpAddress(name: string, _: void): Promise<string> {
                return cloud.getPublicIpAddress(name, {zone: command.zone})
            },
            terminateMachine(name: string, _: void): Promise<null> {
                return cloud.terminateMachine(name, {zone: command.zone})
            },
        }
    }
}
