import qs from 'qs'

export interface Query {
  vue?: null
  mpx?: null
  src?: string
  type?: 'script' | 'template' | 'style' | 'custom'
  index?: string
  lang?: string
  raw?: string
  app?: null
  page?: null
  component?: null
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
