import path from 'path'
import { Plugin, ViteDevServer } from 'vite'
import { createFilter } from '@rollup/pluginutils'
import { createVuePlugin as vue } from 'vite-plugin-vue2'
import replace from '@rollup/plugin-replace'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import commonjs from '@rollup/plugin-commonjs'
import mpxGlobal from './mpx'
import transformMpx from './transformer/mpx'
import addMode from './plugins/addModePlugin'
import {
  renderAppHelpCode,
  renderEntryCode,
  APP_HELPER_CODE,
  ENTRY_HELPER_CODE
} from './helper'
import parseRequest from './utils/parseRequest'
import processOptions from './utils/processOptions'
import { getDescriptor } from './utils/descriptorCache'
import stringifyObject from './utils/stringifyObject'
import handleHotUpdate from './handleHotUpdate'

export type Mode = 'wx' | 'web' | 'ali' | 'swan'

export interface Options {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  mode?: Mode
  env?: string
  srcMode?: Mode
  externalClasses?: string[]
  resolveMode?: 'webpack' | 'native'
  writeMode?: 'changed' | 'full' | null
  autoScopeRules?: Record<string, unknown>
  autoVirtualHostRules?: Record<string, unknown>
  forceDisableInject?: boolean
  forceDisableProxyCtor?: boolean
  transMpxRules?: Record<string, () => boolean>
  defs?: Record<string, unknown>
  modeRules?: Record<string, unknown>
  generateBuildMap?: false
  attributes?: string[]
  externals?: string[] | RegExp[]
  projectRoot?: string
  forceUsePageCtor?: boolean
  postcssInlineConfig?: Record<string, unknown>
  transRpxRules?: null
  auditResource?: boolean
  decodeHTMLText?: boolean
  nativeOptions?: Record<string, unknown>
  i18n?: Record<string, string> | null
  checkUsingComponents?: boolean
  reportSize?: boolean | null
  pathHashMode?:
    | 'absolute'
    | 'relative'
    | ((resourcePath: string, projectRoot: string) => string)
  forceDisableBuiltInLoader?: boolean
  useRelativePath?: boolean
  subpackageModulesRules?: Record<string, unknown>
  forceMainPackageRules?: Record<string, unknown>
  forceProxyEventRules?: Record<string, unknown>
  miniNpmPackages?: string[]
  fileConditionRules?: Record<string, () => boolean>
}

export interface ResolvedOptions extends Required<Options> {
  sourceMap?: boolean
  devServer?: ViteDevServer
  isProduction?: boolean
}

const MpxPluginName = 'vite:mpx'

function mpx(options: ResolvedOptions): Plugin {
  const { include = /\.mpx$/, exclude } = options
  const filter = createFilter(include, exclude)

  return {
    name: MpxPluginName,
    enforce: 'pre',

    config(config, { mode }) {
      if (mode === 'development') {
        return {
          optimizeDeps: {
            exclude: ['@mpxjs/core', '@mpxjs/api-proxy'], // @mpxjs/core need addModePlugin transform
            include: ['axios', 'lodash/flatten.js', 'lodash/throttle'] // The above module contains these CommonJS modules and requires a separate Prebuild
          }
        }
      }
    },

    configResolved(config) {
      Object.assign(options, {
        ...options,
        root: config.root,
        sourceMap: config.command === 'build' ? !!config.build.sourcemap : true,
        isProduction: config.isProduction
      })
    },

    handleHotUpdate(ctx) {
      return handleHotUpdate(ctx)
    },

    async resolveId(id, importer) {
      if (filter(id)) {
        mpxGlobal.entry = path.resolve(path.dirname(importer || ''), id)
        return ENTRY_HELPER_CODE
      }
      if (id === APP_HELPER_CODE) {
        return id
      }
    },

    load(id) {
      if (id === ENTRY_HELPER_CODE) {
        return renderEntryCode(mpxGlobal.entry)
      }
      if (id === APP_HELPER_CODE) {
        const descriptor = getDescriptor(mpxGlobal.entry)
        return descriptor && renderAppHelpCode(descriptor, options)
      }
    },

    async transform(code, id) {
      const { filename, query } = parseRequest(id)
      if (filter(filename) && !query.vue) {
        return await transformMpx(filename, code, query, options, this)
      }
    }
  }
}

export default function (options: Options = {}): Plugin[] {
  const resolvedOptions = processOptions({ ...options })

  const plugins = [
    mpx(resolvedOptions), // mpx => vue
    addMode({
      include: [/@mpxjs\/core/, /@mpxjs\/api-proxy/], // *.* => *.{mode}.*
      mode: resolvedOptions.mode
    }),
    vue({
      include: /\.vue|\.mpx/ // mpx => vue transform
    }),
    replace({
      preventAssignment: true,
      values: stringifyObject({
        ...resolvedOptions.defs,
        'process.env.NODE_ENV': JSON.stringify(
          resolvedOptions.isProduction ? 'production' : 'development'
        )
      })
    })
  ]

  if (!resolvedOptions.isProduction) {
    plugins.push(
      commonjs({
        include: [/@mpxjs\/webpack-plugin\/lib\/utils/, /@mpxjs\/api-proxy\//]
      })
    )
  }

  plugins.push(
    nodePolyfills({
      include: [/@mpxjs/, /\.mpx/, /plugin-mpx:/] // mpx global polyfill
    })
  )

  return plugins
}
