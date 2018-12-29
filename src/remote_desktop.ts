import { Command } from "commander"
import { IBackend } from "./backend"
import { Configurations } from "./configurations"

export interface IRemoteDesktop<Options> {
   connect(hostname: string, options: Options): Promise<null>
}

export type RemoteDesktopCommand =
        (command: Command, configs: Configurations) => ((backend: IBackend) => IRemoteDesktop<void>)
