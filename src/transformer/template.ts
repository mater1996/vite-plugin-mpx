import { TransformPluginContext } from 'rollup'
import { TransformResult } from 'vite'
import { compileSFCTemplate as vueTransformTemplate } from 'vite-plugin-vue2/dist/template'
import { ResolvedOptions } from '../index'
import { SFCDescriptor } from '../compiler'

export default async function transformTemplate(
  code: string,
  filename: string,
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
): Promise<TransformResult | undefined> {
  if (descriptor.template) {
    return await vueTransformTemplate(
      code,
      descriptor.template,
      filename,
      options,
      pluginContext
    )
  }
}
