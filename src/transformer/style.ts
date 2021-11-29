import { TransformPluginContext, TransformResult } from 'rollup'
import { transformStyle as vueTransformStyle } from 'vite-plugin-vue2/dist/style'
import { SFCDescriptor } from '../compiler'

export default async function transformStyle(
  code: string,
  filename: string,
  descriptor: SFCDescriptor,
  index: number,
  pluginContext: TransformPluginContext
): Promise<TransformResult | undefined> {
  // Pass style directly to vue
  return await vueTransformStyle(
    code,
    filename,
    descriptor,
    index,
    pluginContext
  )
}
