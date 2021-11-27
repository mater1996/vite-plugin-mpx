import { Plugin, UserConfig, ViteDevServer } from 'vite'
import { createFilter } from '@rollup/pluginutils'
import { createVuePlugin } from 'vite-plugin-vue2'
import replace from '@rollup/plugin-replace'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import commonjs from '@rollup/plugin-commonjs'
import mpxGlobal from './mpx'
import transformMain from './transformer/main'
import transformTemplate from './transformer/template'
import transformStyle from './transformer/style'
import handleHotUpdate from './handleHotUpdate'
import { renderAppHelpCode, APP_HELPER_CODE } from './helper'
import addExtensionsPlugin, {
  esbuildAddExtensionsPlugin
} from './plugins/addExtensionsPlugin'
import mpxEntryPlugin from './plugins/mpxEntryPlugin'
import parseRequest from './utils/parseRequest'
import processOptions from './utils/processOptions'
import { getDescriptor } from './utils/descriptorCache'
import stringifyObject from './utils/stringifyObject'

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
  isProduction: boolean
  root: string
}

function genCustomExtensions(mode: string, env: string) {
  const res: string[] = [mode]
  if (env) res.push(env, `${mode}.${env}`, `${env}.${mode}`)
  return res
}

function createMpxPlugin(
  options: ResolvedOptions,
  config?: UserConfig
): Plugin {
  const { include = /\.mpx$/, exclude } = options
  const filter = createFilter(include, exclude)

  const mpxVuePlugin = createVuePlugin({
    include: /\.mpx/
  })

  return {
    name: 'vite:mpx',

    config() {
      return config
    },

    configureServer(server) {
      options.devServer = server
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
      return handleHotUpdate(ctx, options)
    },

    async resolveId(id, ...args) {
      if (id === APP_HELPER_CODE) {
        return id
      }
      return mpxVuePlugin.resolveId?.call(this, id, ...args)
    },

    load(id) {
      if (id === APP_HELPER_CODE && mpxGlobal.entry) {
        const { filename } = parseRequest(mpxGlobal.entry)
        const descriptor = getDescriptor(filename)
        return descriptor && renderAppHelpCode(descriptor, options)
      }
      const { filename, query } = parseRequest(id)
      if (query.mpx !== undefined) {
        const descriptor = getDescriptor(filename)
        if (descriptor) {
          let block
          if (query.type === 'template') {
            block = descriptor.template
          } else if (query.type === 'style') {
            block = descriptor.styles[Number(query.index)]
          }
          if (block) {
            return block.vueContent
          }
        }
      }
      return mpxVuePlugin.load?.call(this, id)
    },

    async transform(code, id) {
      const { filename, query } = parseRequest(id)
      if (!filter(filename)) return
      if (query.mpx === undefined) {
        // mpx file => vue file
        return await transformMain(code, filename, query, options, this)
      } else {
        if (query.type === 'template') {
          // mpx template => vue template
          const descriptor = getDescriptor(filename)
          if (descriptor) {
            return await transformTemplate(
              code,
              filename,
              descriptor,
              options,
              this
            )
          }
        }
        if (query.type === 'style') {
          // mpx style => vue style
          const descriptor = getDescriptor(filename)
          if (descriptor) {
            return await transformStyle(
              code,
              filename,
              descriptor,
              Number(query.index),
              this
            )
          }
        }
      }
    }
  }
}

export default function mpx(options: Options = {}): Plugin[] {
  const resolvedOptions = processOptions({ ...options })
  const { mode, env } = resolvedOptions
  const customExtensions = genCustomExtensions(mode, env)

  const plugins = [
    // mpx => vue
    createMpxPlugin(resolvedOptions, {
      optimizeDeps: {
        esbuildOptions: {
          plugins: [
            esbuildAddExtensionsPlugin({
              include: /@mpxjs/, // prebuild for addMode
              extensions: customExtensions
            })
          ]
        }
      }
    }),
    // *.* => *.{extension}.*
    addExtensionsPlugin({
      include: [/@mpxjs/, resolvedOptions.projectRoot],
      extensions: customExtensions
    }),
    mpxEntryPlugin(),
    createVuePlugin(),
    replace({
      preventAssignment: true,
      values: stringifyObject({
        ...resolvedOptions.defs,
        'process.env.NODE_ENV': JSON.stringify(
          resolvedOptions.isProduction ? 'production' : 'development'
        )
      })
    }),
    nodePolyfills({
      include: [/@mpxjs/, /\.mpx/, /plugin-mpx:/, /polyfill-node/],
      exclude: [/polyfill-nodeglobal/] // ignore polyfill self
    })
  ]

  if (!resolvedOptions.isProduction) {
    plugins.push(
      commonjs({
        include: [/@mpxjs\/webpack-plugin\/lib\/utils/]
      })
    )
  }

  return plugins
}
