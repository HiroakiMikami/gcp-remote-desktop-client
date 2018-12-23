export interface VncViewer<Options> {
    connect(port: number, options: Options): Promise<Error | null>
}
