import path from 'path'
import slash from 'slash'
import { ResolvedOptions } from '../index'
import compiler, { SFCDescriptor } from '../compiler'
import { Query } from './parseRequest'
import pathHash from './pageHash'

const cache = new Map<string, SFCDescriptor>()
const prevCache = new Map<string, SFCDescriptor | undefined>()

export function createDescriptor(
  filename: string,
  code: string,
  query: Query,
  options: ResolvedOptions
): SFCDescriptor {
  const { projectRoot, isProduction, mode, defs, env, sourceMap } = options
  const descriptor = compiler.parseComponent(code, {
    mode,
    defs,
    env,
    filePath: filename,
    pad: 'line',
    needMap: sourceMap
  })
  const normalizedPath = slash(
    path.normalize(path.relative(projectRoot, filename))
  )
  descriptor.id = pathHash(normalizedPath + (isProduction ? code : ''))
  descriptor.filename = filename
  descriptor.app = query.app ? true : false
  descriptor.page = query.page ? true : false
  descriptor.component = query.component
    ? true
    : !descriptor.app && !descriptor.page
  cache.set(filename, descriptor)
  return descriptor
}

export function getPrevDescriptor(filename: string): SFCDescriptor | undefined {
  return prevCache.get(filename)
}

export function setPrevDescriptor(
  filename: string,
  entry: SFCDescriptor
): void {
  prevCache.set(filename, entry)
}

export function getDescriptor(
  filename: string,
  code?: string,
  query?: Query,
  options?: ResolvedOptions,
  createIfNotFound = true
): SFCDescriptor | undefined {
  if (cache.has(filename)) {
    return cache.get(filename)
  }
  if (createIfNotFound && code && query && options) {
    return createDescriptor(filename, code, query, options)
  }
}

export function setDescriptor(filename: string, entry: SFCDescriptor): void {
  cache.set(filename, entry)
}
