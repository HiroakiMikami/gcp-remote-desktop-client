import { Command } from "commander"
import { Configurations } from "./configurations"

export interface ICloud<CreateMachineOptions, GetPublicIpAddressOptions, TerminateMachineOptions> {
    createMachine(machineName: string, diskName: string, options: CreateMachineOptions): Promise<null>
    getPublicIpAddress(machineName: string, options: GetPublicIpAddressOptions): Promise<string>
    terminateMachine(machineName: string, options: TerminateMachineOptions): Promise<null>
}

export type CloudBuilder = (command: Command, configs: Configurations) => (() => ICloud<void, void, void>)
