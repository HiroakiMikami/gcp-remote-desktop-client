import { Command } from "commander"

export interface ICloud<CreateMachineOptions, GetPublicIpAddressOptions, TerminateMachineOptions> {
    createMachine(name: string, options: CreateMachineOptions): Promise<null>
    getPublicIpAddress(name: string, options: GetPublicIpAddressOptions): Promise<string>
    terminateMachine(name: string, options: TerminateMachineOptions): Promise<null>
}

export interface ICloudBuilder {
    commandLineArguments(command: Command): Command
    create(command: Command): ICloud<void, void, void>
}
