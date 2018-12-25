import * as fs from "fs"

import { isArray, isObject, promisify } from "util"

export type Configurations = any

export async function load(path: string): Promise<Configurations> {
    const exist = await promisify(fs.exists)(path)
    if (exist) {
        const content = await promisify(fs.readFile)(path)
        return JSON.parse(content.toString())
    } else {
        return {}
    }
}

export function copy(config: Configurations): Configurations {
    if (isArray(config)) {
        const retval: any = []
        for (const elem of config) {
            retval.push(elem)
        }
        return retval
    }
    if (isObject(config)) {
        const retval: any = {}
        for (const key of Object.keys(config)) {
            retval[key] = copy(config[key])
        }
        return retval
    } else {
        return config
    }
}

export function merge(c1: Configurations, c2: Configurations): Configurations {
    const retval: any = {}
    if (isObject(c1)) {
        for (const key of Object.keys(c1)) {
            retval[key] = copy(c1[key])
        }
    }
    if (isObject(c2)) {
        for (const key of Object.keys(c2)) { // overwrite
            retval[key] = merge(retval[key], c2[key])
        }
    } else {
        return copy(c2)
    }

    return retval
}
