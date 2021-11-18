import genComponentTag from '@mpxjs/webpack-plugin/lib/utils/gen-component-tag'
import stringify from '../utils/stringify'
import { SFCDescriptor } from '../compiler'
import { ProcessResult } from './process'

export type ProcessStylesResult = ProcessResult

export default async function processStyles(
  descriptor: SFCDescriptor
): Promise<ProcessStylesResult> {
  const output = ['/* styles */']
  const { styles } = descriptor
  if (styles && styles.length) {
    styles.forEach((style) => {
      output.push(
        genComponentTag(style, {
          attrs(style) {
            const attrs = Object.assign({}, style.attrs)
            // if (options.autoScope) attrs.scoped = true
            attrs.mpxStyleOptions = stringify({
              // scoped: !!options.autoScope,
              // query中包含module字符串会被新版vue-cli中的默认rules当做css-module处理
              mid: descriptor.id
            })
            return attrs
          }
        })
      )
    })
    output.push('\n')
  }
  return {
    output: output.join('\n')
  }
}
