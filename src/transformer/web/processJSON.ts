import path from 'path'
import fs from 'fs'
import { TransformPluginContext } from 'rollup'
import { normalizePath } from '@rollup/pluginutils'
import { ResolvedOptions } from '../../index'
import { SFCDescriptor } from '../../compiler'
import mpx from '../../mpx'
import resolveJson, { JsonConfig } from '../../utils/resolveJson'
import parseRequest from '../../utils/parseRequest'
import pathHash from '../../utils/pageHash'
import resolveModuleContext from '../../utils/resolveModuleContext'
import addQuery from '../../utils/addQuery'
import { createDescriptor } from '../../utils/descriptorCache'
import stringify from '../../utils/stringify'

export default async function processJSON(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
): Promise<void> {
  const jsonConfig = (descriptor.jsonConfig = await resolveJson(
    descriptor,
    options,
    pluginContext
  ))
  const { filename } = descriptor
  const { pagesMap, componentsMap, pagesEntryMap } = mpx
  const localPagesMap: SFCDescriptor['localPagesMap'] = {}
  const localComponentsMap: SFCDescriptor['localComponentsMap'] = {}

  let tabBarMap: Record<string, unknown> = {}
  let tabBarStr = ''

  const defaultTabbar = {
    borderStyle: 'black',
    position: 'bottom',
    custom: false,
    isShow: true
  }

  function emitWarning(msg: string) {
    pluginContext.warn(new Error('[json processor][' + filename + ']: ' + msg))
  }

  /**
   * ./page/index/index.mpx = page/index/index
   * @param page - pagePath
   */
  function genPageName(page: string, dirname: string) {
    const relative = path.relative(dirname, page)
    return normalizePath(
      path.join('', /^(.*?)(\.[^.]*)?$/.exec(relative)?.[1] || '')
    )
  }

  const processTabBar = async (tabBar: JsonConfig['tabBar']) => {
    if (tabBar) {
      tabBar = Object.assign({}, defaultTabbar, tabBar)
      tabBarMap = {}
      jsonConfig?.tabBar?.list?.forEach(({ pagePath }) => {
        tabBarMap[pagePath] = true
      })
      tabBarStr = stringify(tabBar)
      tabBarStr = tabBarStr.replace(
        /"(iconPath|selectedIconPath)":"([^"]+)"/g,
        function (matched) {
          return matched
        }
      )
    }
  }

  const processPages = async (
    pages: JsonConfig['pages'] = [],
    importer: string
  ) => {
    const dirname = resolveModuleContext(importer)
    for (const pagePath of pages) {
      const pageModule = await pluginContext.resolve(
        addQuery(pagePath, { page: null }),
        importer
      )
      if (pageModule) {
        const { filename: pageFileName, query } = parseRequest(pageModule.id)
        const pageName = genPageName(pageFileName, dirname)
        const pageId = pageModule.id
        if (localPagesMap[pageName]) {
          emitWarning(
            `Current page [${pagePath}] which is imported from [${importer}] has been registered in pagesMap already, it will be ignored, please check it and remove the redundant page declaration!`
          )
          return
        }
        pagesMap[pageId] = pageName
        pagesEntryMap[pageId] = importer
        localPagesMap[pageName] = {
          resource: pageId,
          async: query.async !== undefined,
          isFirst: query.isFirst !== undefined
        }
      } else {
        emitWarning(
          `Current page [${pagePath}] is not in current pages directory [${dirname}]`
        )
      }
    }
  }

  const processComponent = async (
    componentName: string,
    componentPath: string,
    importer: string
  ) => {
    if (componentPath) {
      const componetModule = await pluginContext.resolve(
        addQuery(componentPath, { component: null }),
        importer
      )
      if (componetModule) {
        const componentId = componetModule.id
        const { filename: componentFileName, query } = parseRequest(componentId)
        componentsMap[componentFileName] =
          componentFileName + pathHash(componentFileName)
        localComponentsMap[componentName] = {
          resource: componentId,
          async: !!query.async
        }
      }
    }
  }

  const processComponents = async (
    components: JsonConfig['usingComponents'],
    importer: string
  ) => {
    for (const key in components) {
      await processComponent(key, components[key], importer)
    }
  }

  const processGenerics = async (
    generics: JsonConfig['componentGenerics'] = {},
    importer: string
  ) => {
    for (const key in generics) {
      const generic = generics[key]
      if (generic.default) {
        await processComponent(`${key}default`, generic.default, importer)
      }
    }
  }

  const processPackages = async (
    packages: JsonConfig['packages'] = [],
    context: string
  ) => {
    for (const packagePath of packages) {
      const { filename, query } = parseRequest(packagePath)
      const packageModule = await pluginContext.resolve(filename, context)
      if (packageModule) {
        const packageId = packageModule.id
        pluginContext.addWatchFile(packageId)
        const code = await fs.promises.readFile(packageId, 'utf-8')
        const descriptor = createDescriptor(packageId, code, query, options)
        const packageJsonConfig = (descriptor.jsonConfig = await resolveJson(
          descriptor,
          options,
          pluginContext
        ))
        await processPages(packageJsonConfig.pages, packageId)
        if (packageJsonConfig.packages) {
          await processPackages(packageJsonConfig.packages, packageId)
        }
      }
    }
  }

  try {
    await processPages(jsonConfig.pages, filename)
    await processComponents(jsonConfig.usingComponents, filename)
    await processGenerics(jsonConfig.componentGenerics, filename)
    await processTabBar(jsonConfig.tabBar)
    await processPackages(jsonConfig.packages, filename)

    descriptor.localPagesMap = localPagesMap
    descriptor.localComponentsMap = localComponentsMap
    descriptor.tabBarMap = tabBarMap
    descriptor.tabBarStr = tabBarStr
  } catch (error) {
    pluginContext.error(`[mpx loader] process json error: ${error}`)
  }
}
