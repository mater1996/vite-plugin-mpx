import path from 'path'
import genComponentTag from '@mpxjs/webpack-plugin/lib/utils/gen-component-tag'
import { TransformPluginContext } from 'rollup'
import { ProcessResult } from './process'
import templateCompiler, { SFCDescriptor } from '../../compiler'
import { ResolvedOptions } from '../../index'
import { resolveMpxRuntime } from '../../utils/resolveMpx'

const mpxKeepAlivePath = resolveMpxRuntime('components/web/mpx-keep-alive.vue')

export type ProcessTemplateResult = ProcessResult

function calculateRootEleChild(arr: []) {
  if (!arr) {
    return 0
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.reduce((total: number, item: any) => {
    if (item.type === 1) {
      if (item.tag === 'template') {
        total += calculateRootEleChild(item.children)
      } else {
        total += 1
      }
    }
    return total
  }, 0)
}

export default async function processTemplate(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext?: TransformPluginContext
): Promise<ProcessTemplateResult> {
  const {
    mode,
    srcMode,
    defs,
    decodeHTMLText,
    externalClasses,
    checkUsingComponents
  } = options
  const { id, filename, jsonConfig, app } = descriptor
  const { usingComponents = {}, componentGenerics = {} } = jsonConfig
  const builtInComponentsMap: SFCDescriptor['builtInComponentsMap'] = {}
  let genericsInfo: SFCDescriptor['genericsInfo']
  const output = []

  function addBuildComponent(name: string, resource: string) {
    builtInComponentsMap[name] = builtInComponentsMap[name] || {}
    Object.assign(builtInComponentsMap[name], { resource })
  }

  if (app) {
    addBuildComponent('mpx-keep-alive', mpxKeepAlivePath)
  }

  const { template } = descriptor

  if (template) {
    if (template.src) {
      pluginContext?.error(
        `[mpx loader][${filename}]: template content must be inline in .mpx files!`
      )
    }

    if (template.lang) {
      pluginContext?.error(
        `[mpx loader][ ${filename}]: template lang is not supported in trans web mode temporarily, we will support it in the future!`
      )
    }

    output.push(
      genComponentTag(template, (template) => {
        if (!app && template.content) {
          const templateSrcMode = template.mode || srcMode
          const parsed = templateCompiler.parse(template.content, {
            warn: (msg) => {
              pluginContext?.warn(
                new Error('[template compiler][' + filename + ']: ' + msg)
              )
            },
            error: (msg) => {
              pluginContext?.error(
                '[template compiler][' + filename + ']: ' + msg
              )
            },
            usingComponents: Object.keys(usingComponents),
            componentGenerics,
            hasComment: !!template?.attrs?.comments,
            isNative: false,
            basename: path.basename(filename),
            isComponent: !app,
            mode,
            srcMode: templateSrcMode,
            defs,
            decodeHTMLText,
            externalClasses,
            checkUsingComponents,
            hasScoped: false,
            moduleId: id,
            filePath: filename,
            i18n: null,
            globalComponents: []
          })

          // 暂时不处理wxsModule
          // if (parsed.meta.wxsModuleMap) {
          //   wxsModuleMap = parsed.meta.wxsModuleMap
          // }
          // if (parsed.meta.wxsContentMap) {
          //   for (const module in parsed.meta.wxsContentMap) {
          //     wxsContentMap[`${resourcePath}~${module}`] =
          //       parsed.meta.wxsContentMap[module]
          //   }
          // }

          if (parsed.meta.builtInComponentsMap) {
            Object.entries(parsed.meta.builtInComponentsMap).forEach(
              ([name, resource]) => {
                addBuildComponent(name, resource as string)
              }
            )
          }

          if (parsed.meta.genericsInfo) {
            genericsInfo = parsed.meta.genericsInfo
          }

          // 输出H5有多个root element时, 使用div标签包裹
          if (parsed.root.tag === 'temp-node') {
            const childLen = calculateRootEleChild(parsed.root.children)
            if (childLen >= 2) {
              parsed.root.tag = 'div'
            }
          }

          template.vueContent = templateCompiler.serialize(parsed.root)
        }

        descriptor.builtInComponentsMap = builtInComponentsMap
        descriptor.genericsInfo = genericsInfo

        return template.vueContent
      })
    )

    output.push('\n')
  }

  return {
    output: output.join('\n')
  }
}
