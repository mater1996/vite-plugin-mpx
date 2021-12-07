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
  app: boolean
  page: boolean
  component: boolean
  jsonConfig: JsonConfig
  builtInComponentsMap: Record<
    string,
    {
      resource: string
    }
  >
  genericsInfo?: Record<string, unknown>
  localPagesMap: Record<
    string,
    {
      resource: string
      async: boolean
      isFirst: boolean
    }
  >
  localComponentsMap: Record<
    string,
    {
      resource: string
      async: boolean
    }
  >
  tabBarMap: Record<string, unknown>
  tabBarStr: string
}

interface Compiler {
  parseComponent(
    template: string,
    options: Parameters<MpxCompiler['parseComponent']>[1]
  ): SFCDescriptor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parse(template: string, options: Parameters<MpxCompiler['parse']>[1]): any
  serialize: MpxCompiler['serialize']
}

const compiler: Compiler = {
  parseComponent(template, options) {
    const descriptor = parseComponent(template, options) as SFCDescriptor
    if (descriptor.script && descriptor.script.map) {
      const sources = descriptor.script.map.sources || []
      descriptor.script.map.sources = sources.map((v: string) => v.split('?')[0])
    }
    return descriptor
  },
  parse(template, options) {
    return mpxCompiler.parse(template, options)
  },
  serialize(root) {
    return mpxCompiler.serialize(root)
  }
}

export default compiler
