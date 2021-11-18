import mpxCompiler, {
  CompilerResult
} from '@mpxjs/webpack-plugin/lib/template-compiler/compiler'
import parseComponent from '@mpxjs/webpack-plugin/lib/parser'
import { JsonConfig } from './utils/resolveJson'

export * from '@mpxjs/webpack-plugin/lib/template-compiler/compiler'

type MpxCompiler = typeof mpxCompiler

export interface SFCDescriptor extends CompilerResult {
  id: string
  filename: string
  page: boolean
  component: boolean
  app: boolean
  jsonConfig: JsonConfig
  vue?: string
}

interface Compiler {
  parseComponent(
    template: string,
    options: Parameters<MpxCompiler['parseComponent']>[1]
  ): SFCDescriptor
  parse(template: string, options: Parameters<MpxCompiler['parse']>[1]): any
  serialize: MpxCompiler['serialize']
}

const compiler: Compiler = {
  parseComponent(template, options) {
    return parseComponent(template, options) as SFCDescriptor
  },
  parse(template, options) {
    return mpxCompiler.parse(template, options)
  },
  serialize(root) {
    return mpxCompiler.serialize(root)
  }
}

export default compiler
