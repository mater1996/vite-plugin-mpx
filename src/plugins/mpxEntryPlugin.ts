import { Plugin } from 'vite'
import { createFilter } from '@rollup/pluginutils'
import mpxGlobal from '../mpx'
import parseRequest from '../utils/parseRequest'

export default function resolveEntryPlugin(): Plugin {
  const filter = createFilter([/\.mpx/])
  return {
    name: 'vite:mpx-entry-plugin',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      const { filename, query } = parseRequest(id)
      if (!filter(filename)) return
      if (
        query.mpx === undefined &&
        query.app === undefined &&
        query.page === undefined &&
        query.component === undefined
      ) {
        // entry mpx
        const resolution = await this.resolve(id, importer, {
          skipSelf: true,
          ...options
        })
        if (!resolution) {
          this.error('not found mpx entry')
          return null
        }
        return (mpxGlobal.entry = resolution.id)
      }
    }
  }
}
