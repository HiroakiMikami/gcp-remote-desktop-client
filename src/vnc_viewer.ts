export interface IVncViewer<Options> {
    connect(port: number, options: Options): Promise<Error | null>;
}
