import path from 'path'
import parseRequest from './parseRequest'

export default function resolveContext(
  context: string,
  request: string
): string {
  const { query } = parseRequest(request)
  context = query.context || context
  return path.join(context, request)
}
