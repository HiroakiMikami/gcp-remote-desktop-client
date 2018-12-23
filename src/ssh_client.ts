export interface ISshClient<Options> {
    portForward(port: number, username: string, hostname: string,
                from: number, to: number, options: Options): Promise<Error | null>
}
