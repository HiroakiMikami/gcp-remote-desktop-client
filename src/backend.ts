import { ISshClient } from "./ssh_client"
import { IVncViewer } from "./vnc_viewer"

export interface IBackend {
    sshClient: ISshClient<void>
    vncViewer: IVncViewer<void>
}
