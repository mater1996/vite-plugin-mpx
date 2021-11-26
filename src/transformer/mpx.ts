import { TransformPluginContext } from 'rollup'
import { TransformResult } from 'vite'
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
    // console.log('descriptor', descriptor)
    return {
      code: result,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map: (descriptor.script?.map as any) || {
        mappings: ''
      }
    }
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
