import qs from 'qs'

export interface Query {
  vue?: boolean
  src?: boolean
  type?: 'script' | 'template' | 'style' | 'custom'
  index?: number
  lang?: string
  raw?: boolean
  app?: boolean
  page?: boolean
  component?: boolean
  componentId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export default function parseRequest(id: string): {
  filename: string
  query: Query
} {
  const [filename, rawQuery] = id.split(`?`, 2)
  const query = qs.parse(rawQuery, { strictNullHandling: true }) as Query
  return {
    filename,
    query
  }
}
