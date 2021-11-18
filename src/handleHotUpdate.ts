import { HmrContext, ModuleNode } from 'vite'

export default function ({ modules }: HmrContext): ModuleNode[] {
  return [modules[0]]
}
