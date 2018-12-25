import { Command } from "commander"

export interface ICloud<CreateMachineOptions, GetPublicIpAddressOptions, TerminateMachineOptions> {
    createMachine(name: string, options: CreateMachineOptions): Promise<Error | null>
    getPublicIpAddress(name: string, options: GetPublicIpAddressOptions): Promise<Error | string>
    terminateMachine(name: string, options: TerminateMachineOptions): Promise<Error | null>
}

export interface ICloudBuilder {
    commandLineArguments(command: Command): Command
    create(command: Command): ICloud<void, void, void>
}
