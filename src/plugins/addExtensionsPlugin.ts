import path from 'path'
import fs from 'fs'
import { Plugin as EsbuildPlugin } from 'esbuild'
import { Plugin } from 'vite'
import { createFilter } from '@rollup/pluginutils'

export interface addExtensionsOptions {
  include: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  extensions: string[]
}

export interface EsbuildAddExtensionsOptions {
  include: RegExp
  extensions: string[]
}

/**
 * generate file path with mode
 * @param originPath - path/to/index.js
 * @param extendsion - string
 * @returns path/to/index.extendsion.js
 */
function genExtensionsFilePath(originPath: string, extendsion: string): string {
  const parseResult = path.parse(originPath)
  return path.format({
    ...parseResult,
    name: `${parseResult.name}.${extendsion}`,
    base: undefined
  })
}

export function esbuildAddExtensionsPlugin(
  options: EsbuildAddExtensionsOptions
): EsbuildPlugin {
  return {
    name: 'esbuild:mpx-file-estensions',
    setup(build) {
      build.onLoad({ filter: options.include }, async (args) => {
        for (const extendsion of options.extensions) {
          try {
            const filePath = genExtensionsFilePath(args.path, extendsion)
            await fs.promises.access(filePath)
            return {
              contents: await fs.promises.readFile(filePath, 'utf-8')
            }
          } catch {}
        }
      })
    }
  }
}

export default function addExtensionsPlugin(
  options: addExtensionsOptions
): Plugin {
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'vite:mpx-file-estensions',
    enforce: 'pre',
    async load(id) {
      if (!filter(id)) return
      for (const extendsion of options.extensions) {
        try {
          const filePath = genExtensionsFilePath(id, extendsion)
          await fs.promises.access(filePath)
          return {
            code: await fs.promises.readFile(filePath, 'utf-8')
          }
        } catch {}
      }
    }
  }
}