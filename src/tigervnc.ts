import { doNothing, toFunction } from "./utils";
import { IVncViewer } from "./vnc_viewer";

export interface IOptions {
    passwordFile?: string;
    compressLevel?: number;
    qualityLevel?: number;
}

type VncViewerCommand = (options: ReadonlyArray<string>) => Promise<Error | null>;

export class VncViewer implements IVncViewer<IOptions> {
    private vncViewerCommand: VncViewerCommand;
    constructor(vncViewerCommand: string | VncViewerCommand = "vncviewer") {
        if (typeof(vncViewerCommand) === "string") {
            this.vncViewerCommand = toFunction(vncViewerCommand, doNothing);
        } else {
            this.vncViewerCommand = vncViewerCommand;
        }
    }
    public connect(port: number, options: IOptions): Promise<Error> {
        const args = [];
        if (options.passwordFile !== undefined) {
            args.push("-PasswordFile");
            args.push(options.passwordFile);
        }
        if (options.compressLevel !== undefined) {
            args.push("-CompressLevel");
            args.push(`${options.compressLevel}`);
        }
        if (options.qualityLevel !== undefined) {
            args.push("-QualityLevel");
            args.push(`${options.qualityLevel}`);
        }
        args.push(`::${port}`);
        return this.vncViewerCommand(args);
    }
}
