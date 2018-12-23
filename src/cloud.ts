export interface ICloud<CreateMachineOptions, GetPublicIpAddressOptions, TerminateMachineOptions> {
    createMachine(name: string, options: CreateMachineOptions): Promise<Error | null>
    getPublicIpAddress(name: string, options: GetPublicIpAddressOptions): Promise<Error | string>
    terminateMachine(name: string, options: TerminateMachineOptions): Promise<Error | null>
}
