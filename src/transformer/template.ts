import { TransformPluginContext } from 'rollup'
import { TransformResult } from 'vite'
import { ResolvedOptions } from '../index'
import { SFCDescriptor } from '../compiler'
import processTemplate from './web/processTemplate'

export default async function transfromTemplate(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
): Promise<TransformResult | undefined> {
  const templateResult = await processTemplate(
    descriptor,
    options,
    pluginContext
  )
  return {
    code: templateResult.output
      .replace(/<template>/, '')
      .replace(/<\template>/, ''),
    map: {
      mappings: ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }
}
