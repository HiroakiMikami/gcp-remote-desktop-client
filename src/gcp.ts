import { Command } from "commander"
import { isString } from "util"
import { ICloud, ICloudBuilder } from "./cloud"
import { Configurations } from "./configurations"
import { Executable } from "./executable"

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

type GcloudCommand = (options: ReadonlyArray<string>) => Promise<string>

export class Cloud implements ICloud<ICreateMachineOptions, IOptions, IOptions> {
    private gcloudCommand: (options: ReadonlyArray<string>) => Promise<null>
    private gcloudCommandWithStdout: (options: ReadonlyArray<string>) => Promise<string>
    constructor(gcloudCommand: string | GcloudCommand = "gcloud") {
        if (isString(gcloudCommand)) {
            const gcloud = new Executable(gcloudCommand)
            this.gcloudCommand = (args: string[]) => gcloud.execute(args).then(() => null)
            this.gcloudCommandWithStdout = async (args: string[]) => {
                const result = await gcloud.execute(args, true)
                return result.stdout
            }
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
        if (isString(options.machineType)) {
            machineType = options.machineType
        } else {
            const tmp = options.machineType
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
            args.push(`--filter="zone:( ${options.zone} )"`)
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
    public commandLineArguments(command: Command, configs: Configurations): Command {
        let preemptible = configs.preemptible
        if (preemptible === undefined) {
            preemptible = false
        }
        command
            .option("--gcloud-path <command>", "The path of `gcloud` command", "gcloud")
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
        return command
            .option("--tags <tag1>[,<tag2>...]", "The network tags", parseTags, configs.tags)
            .option("--zone <zone>", "The zone", configs.zone)
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
