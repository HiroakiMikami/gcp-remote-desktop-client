import { ICloud } from "./cloud"
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
}

type GcloudCommandWithStdout = (options: ReadonlyArray<string>) => Promise<Error | string>

export class Cloud implements ICloud<ICreateMachineOptions, IOptions, IOptions> {
    private gcloudCommand: (options: ReadonlyArray<string>) => Promise<Error | null>
    private gcloudCommandWithStdout: (options: ReadonlyArray<string>) => Promise<Error | string>
    constructor(gcloudCommand: string | GcloudCommandWithStdout = "gcloud") {
        if (typeof(gcloudCommand) === "string") {
            this.gcloudCommand = toFunction(gcloudCommand, doNothing)
            this.gcloudCommandWithStdout = toFunction(gcloudCommand, getResultFromStdout((stdout) => stdout))
        } else {
            this.gcloudCommand = (args) => gcloudCommand(args).then((result) => {
                if (result instanceof Error) {
                    return result
                }
                return null
            })
            this.gcloudCommandWithStdout = gcloudCommand
        }
    }
    public createMachine(name: string, options: ICreateMachineOptions): Promise<Error | null> {
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
        if (options.preemptible) {
            createArgs.push("--preemptible")
        }
        createArgs.push(`--machine-type=${machineType}`)
        createArgs.push(`--disk=name=${name},device-name=${name},mode=rw,boot=yes`)

        return this.gcloudCommand(createArgs).then((result) => {
            if (result instanceof Error) {
                return result
            }
            return this.gcloudCommand(startArgs)
        })
    }
    public getPublicIpAddress(name: string, options: IOptions): Promise<Error | string> {
        const args = ["compute", "instances", "list",
                    `--filter="name=${name}"`,
                    "--format='value(networkInterfaces[0].accessConfigs[0].natIP)'"]
        if (options.zone !== undefined) {
            args.push(`--zones=${options.zone}`)
        }
        return this.gcloudCommandWithStdout(args)
    }
    public terminateMachine(name: string, options: IOptions): Promise<Error | null> {
        const stopArgs = ["compute", "instances", "stop"]
        const deleteArgs = ["compute", "instances", "delete", "--keep-disks", "all"]
        if (options.zone !== undefined) {
            stopArgs.push(`--zone=${options.zone}`)
            deleteArgs.push(`--zone=${options.zone}`)
        }
        stopArgs.push(name)
        deleteArgs.push(name)
        return this.gcloudCommand(stopArgs).then((result) => {
            if (result instanceof Error) {
                return result
            }
            return this.gcloudCommand(deleteArgs)
        })
    }
}
