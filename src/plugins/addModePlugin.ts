import path from 'path'
import fs from 'fs'
import { Plugin as EsbuildPlugin } from 'esbuild'
import { Plugin } from 'vite'
import { createFilter } from '@rollup/pluginutils'

export interface AddModeOptions {
  include: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  mode: 'wx' | 'web' | 'ali' | 'swan'
}

export interface EsbuildAddModeOptions {
  include: RegExp
  mode: 'wx' | 'web' | 'ali' | 'swan'
}

export function esbuildAddModePlugin(
  options: EsbuildAddModeOptions
): EsbuildPlugin {
  return {
    name: 'esbuild:mpx-file-mode',
    setup(build) {
      build.onLoad({ filter: options.include }, (args) => {
        const parseResult = path.parse(args.path)
        const modeFile = path.format({
          ...parseResult,
          name: `${parseResult.name}.${options.mode}`,
          base: undefined
        })
        if (fs.existsSync(modeFile)) {
          return {
            contents: fs.readFileSync(modeFile)
          }
        }
      })
    }
  }
}

export default function addModePlugin(options: AddModeOptions): Plugin {
  const filter = createFilter(options.include, options.exclude)

  return {
    name: 'vite:mpx-file-mode',
    enforce: 'pre',

    async resolveId(source, importer) {
      const resolution = await this.resolve(source, importer, {
        skipSelf: true
      })
      if (resolution && filter(resolution.id)) {
        const parseResult = path.parse(resolution.id)
        const modeFilePath = path.format({
          ...parseResult,
          name: `${parseResult.name}.${options.mode}`,
          base: undefined
        })
        return await this.resolve(modeFilePath, importer, {
          skipSelf: true
        })
      }
      return null
    }
  }
}
