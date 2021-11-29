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
  const { template } = descriptor
  if (template) {
    // ProcessScript relies on template parsing, the result is cached at the time of processTemplate
    return await vueTransformTemplate(
      template.vueContent,
      template,
      filename,
      options,
      pluginContext
    )
  }
}
