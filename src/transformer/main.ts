import { TransformPluginContext, TransformResult } from 'rollup'
import { transformMain as vueTransformMain } from 'vite-plugin-vue2/dist/main'
import processTemplate from './web/processTemplate'
import processJSON from './web/processJSON'
import processStyles from './web/processStyles'
import processScript from './web/processScript'
import { ResolvedOptions } from '../index'
import { SFCDescriptor } from '../compiler'
import { createDescriptor } from '../utils/descriptorCache'
import { Query } from '../utils/parseRequest'
import { ProcessResult } from './web/process'

export default async function transformMain(
  code: string,
  filename: string,
  query: Query,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
): Promise<TransformResult | undefined> {
  const descriptor = createDescriptor(filename, code, query, options)
  if (descriptor) {
    await processJSON(descriptor, options, pluginContext)
    // generate template block
    const templateBlock = await genTemplateCode(
      descriptor,
      options,
      pluginContext
    )
    // generate script block
    const scriptBlock = await genScriptCode(descriptor, options, pluginContext)
    // generate styles block
    const stylesBlock = await genStylesCode(descriptor)
    // transform vue
    const vueCode = await vueTransformMain(
      genVueSfc(templateBlock, scriptBlock, stylesBlock),
      filename,
      options,
      pluginContext
    )
    // replace "*.mpx?vue" to "*.mpx?mpx"
    // this way mpx does not enter the logic of the Vueplugin
    vueCode.code = vueCode.code.replace(/(\.mpx)(\?vue)/g, `$1?mpx`)
    return vueCode
  }
}

function genVueSfc(...args: ProcessResult[]) {
  return args.map((v) => v.output).join('\n')
}

async function genTemplateCode(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
) {
  return await processTemplate(descriptor, options, pluginContext)
}

async function genStylesCode(descriptor: SFCDescriptor) {
  return await processStyles(descriptor)
}

async function genScriptCode(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
) {
  return await processScript(descriptor, options, pluginContext)
}
