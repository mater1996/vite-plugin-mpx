/**
 * forked from mpxjs/webpack-plugin/lib/template-compiler/index.js
 */
const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = '((?:' + ncname + '\\:)?' + ncname + ')'
const startTagOpen = new RegExp('<' + qnameCapture, 'g')

export default function parseHtmlTags(source: string): string[] {
  const result = []
  let exec
  while ((exec = startTagOpen.exec(source))) {
    result.push(exec[1])
  }
  return result
}
