import { Command } from "commander"
import { Configurations } from "./configurations"

export interface ICloud<CreateMachineOptions, GetPublicIpAddressOptions, TerminateMachineOptions> {
    createMachine(name: string, options: CreateMachineOptions): Promise<null>
    getPublicIpAddress(name: string, options: GetPublicIpAddressOptions): Promise<string>
    terminateMachine(name: string, options: TerminateMachineOptions): Promise<null>
}

export type CloudBuilder = (command: Command, configs: Configurations) => (() => ICloud<void, void, void>)
