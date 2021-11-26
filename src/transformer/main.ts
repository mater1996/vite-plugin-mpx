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

export default async function transformMpx(
  code: string,
  filename: string,
  query: Query,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
): Promise<TransformResult | undefined> {
  const descriptor = createDescriptor(filename, code, query, options)
  if (descriptor) {
    await processJSON(descriptor, options, pluginContext)
    const templateResult = await genTemplateCode(
      descriptor,
      options,
      pluginContext
    )
    // console.log('templateResult', templateResult)
    const styleResult = await genStylesCode(descriptor)
    // console.log('styleResult', styleResult)
    const scriptResult = await genScriptCode(descriptor, options, pluginContext)
    // console.log('scriptResult', scriptResult)
    const result = [
      templateResult.output,
      styleResult.output,
      scriptResult.output
    ].join('\n')
    const vueCode = await vueTransformMain(
      result,
      filename,
      options,
      pluginContext
    )
    // replace "*.mpx?vue" to "*.mpx?mpx"
    // this way mpx does not enter the logic of the Vueplugin
    vueCode.code = vueCode.code.replace(/(\.mpx)(\?vue)/g, `$1?mpx`)
    // console.log('descriptor', descriptor)
    return vueCode
  }
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
