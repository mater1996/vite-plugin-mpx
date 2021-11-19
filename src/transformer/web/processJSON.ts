import path from 'path'
import { TransformPluginContext } from 'rollup'
import { ProcessResult } from './process'
import { ResolvedOptions } from '../../index'
import { SFCDescriptor } from '../../compiler'
import mpx from '../../mpx'
import { JsonConfig } from '../../utils/resolveJson'
import normalizePath from '../../utils/normalizePath'
import parseRequest from '../../utils/parseRequest'
import pathHash from '../../utils/pageHash'
import resolveModuleContext from '../../utils/resolveModuleContext'
import resolveContext from '../../utils/resolveContext'

export interface ProcessJsonResult extends ProcessResult {
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

export default async function processJSON(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext: TransformPluginContext
): Promise<ProcessJsonResult> {
  const { filename: filename, jsonConfig } = descriptor
  const { pagesMap, componentsMap, pagesEntryMap } = mpx
  const localPagesMap: ProcessJsonResult['localPagesMap'] = {}
  const localComponentsMap: ProcessJsonResult['localComponentsMap'] = {}

  const context = resolveModuleContext(descriptor.filename)

  const output = '/* json */\n'
  let tabBarMap: Record<string, unknown> = {}
  let tabBarStr = ''

  const emitWarning = (msg: string) => {
    pluginContext.warn(new Error('[json processor][' + filename + ']: ' + msg))
  }

  const defaultTabbar = {
    borderStyle: 'black',
    position: 'bottom',
    custom: false,
    isShow: true
  }

  const processTabBar = async (tabBar: JsonConfig['tabBar']) => {
    if (tabBar) {
      tabBar = Object.assign({}, defaultTabbar, tabBar)
      tabBarMap = {}
      jsonConfig?.tabBar?.list?.forEach(({ pagePath }) => {
        tabBarMap[pagePath] = true
      })
      tabBarStr = JSON.stringify(tabBar)
      tabBarStr = tabBarStr.replace(
        /"(iconPath|selectedIconPath)":"([^"]+)"/g,
        function (matched) {
          return matched
        }
      )
    }
  }

  const getPageName = (resourcePath: string, ext: string) => {
    const baseName = path.basename(resourcePath, ext)
    return path.join('pages', baseName + pathHash(resourcePath), baseName)
  }

  const processPages = async (
    pages: JsonConfig['pages'],
    srcRoot = '',
    tarRoot = ''
  ) => {
    if (pages) {
      const newContext = path.join(context, srcRoot)
      pages.forEach((page) => {
        let aliasPath = ''
        if (typeof page !== 'string') {
          aliasPath = page.path
          page = page.src
        }
        const resource = resolveContext(newContext, page)
        const { filename: pageResourcePath, query } = parseRequest(resource)
        const ext = path.extname(pageResourcePath)
        // 获取pageName
        let pageName: string
        if (aliasPath) {
          pageName = normalizePath(path.join(tarRoot, aliasPath))
          const conflictPage = Object.entries(pagesMap).find(
            ([key, val]) => val === pageName && key !== pageResourcePath
          )
          if (conflictPage) {
            throw new Error(
              `Current page [${pageResourcePath}] registers a conflict page path [${pageName}] with existed page [${conflictPage[0]}], which is not allowed, please rename it!`
            )
          }
        } else {
          const relative = path.relative(context, pageResourcePath)
          if (/^\./.test(relative)) {
            // 如果当前page不存在于context中，对其进行重命名
            pageName = normalizePath(
              path.join(tarRoot, getPageName(pageResourcePath, ext))
            )
            emitWarning(
              `Current page [${pageResourcePath}] is not in current pages directory [${context}], the page path will be replaced with [${pageName}], use ?resolve to get the page path and navigate to it!`
            )
          } else {
            pageName = normalizePath(
              path.join(tarRoot, /^(.*?)(\.[^.]*)?$/.exec(relative)?.[1] || '')
            )
            // 如果当前page与已有page存在命名冲突，也进行重命名
            for (const key in pagesMap) {
              // 此处引入pagesEntryMap确保相同entry下路由路径重复注册才报错，不同entry下的路由路径重复则无影响
              if (
                pagesMap[key] === pageName &&
                key !== pageResourcePath &&
                pagesEntryMap[key] === filename
              ) {
                const pageNameRaw = pageName
                pageName = normalizePath(
                  path.join(tarRoot, getPageName(pageResourcePath, ext))
                )
                emitWarning(
                  `Current page [${pageResourcePath}] is registered with a conflict page path [${pageNameRaw}] which is already existed in system, the page path will be replaced with [${pageName}], use ?resolve to get the page path and navigate to it!`
                )
                break
              }
            }
          }
        }
        if (pagesMap[pageResourcePath]) {
          emitWarning(
            `Current page [${pageResourcePath}] which is imported from [${filename}] has been registered in pagesMap already, it will be ignored, please check it and remove the redundant page declaration!`
          )
        }
        pagesMap[pageResourcePath] = pageName
        pagesEntryMap[pageResourcePath] = filename
        localPagesMap[pageName] = {
          resource: resource,
          async: !!(tarRoot || query.async),
          isFirst: query.isFirst
        }
      })
    }
  }

  const processComponents = async (
    components: JsonConfig['usingComponents']
  ) => {
    return components
      ? Promise.all(
          Object.keys(components).map((key) => {
            return processComponent(components[key], key)
          }) || []
        )
      : Promise.resolve()
  }

  const processComponent = async (component: string, componentName: string) => {
    if (component) {
      const { filename, query } = parseRequest(
        resolveContext(context, component)
      )
      const parsed = path.parse(filename)
      const componentId = parsed.name + pathHash(filename)
      componentsMap[filename] = componentId
      localComponentsMap[componentName] = {
        resource: filename,
        async: !!query.async
      }
    }
  }

  const processGenerics = (generics: JsonConfig['componentGenerics']) => {
    return generics
      ? Promise.all(
          Object.keys(generics).map((key) => {
            const generic = generics[key]
            if (generic.default) {
              return processComponent(generic.default, `${key}default`)
            } else {
              return Promise.resolve()
            }
          }) || []
        )
      : Promise.resolve()
  }

  try {
    await processPages(jsonConfig.pages, '', '')
    await processComponents(jsonConfig.usingComponents)
    await processGenerics(jsonConfig.componentGenerics)
    await processTabBar(jsonConfig.tabBar)
  } catch (error) {
    console.log(error)
  }

  return {
    output,
    localPagesMap,
    localComponentsMap,
    tabBarMap,
    tabBarStr
  }
}
