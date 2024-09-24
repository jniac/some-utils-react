import { useState } from 'react'

import { useEffects } from './effects'

/**
 * Fetch and parse data from a URL.
 * 
 * Supported extensions:
 * - JSON
 * - YAML (through [js-yaml](https://www.npmjs.com/package/js-yaml))
 */
export function useFetchAndParse<T = any>(url: string, { autoParse = true } = {}): T | null {
  const [data, setData] = useState<T | null>(null)

  useEffects(async function* (_, state) {
    const response = await window.fetch(url)
    const data = await response.text()

    if (!state.mounted) {
      return
    }

    if (!autoParse) {
      setData(data as any)
      return
    }

    const extension = url.split('.').pop()
    switch (extension) {
      case 'txt': {
        setData(data as any)
        break
      }

      case 'json': {
        setData(JSON.parse(data))
        break
      }

      case 'yaml': {
        const yaml = await import('js-yaml')
        if (!state.mounted) {
          return
        }
        setData(yaml.load(data) as any)
        break
      }

      default: {
        throw new Error(`Unknown extension: ${extension}`)
      }
    }
  }, [url])

  return data
}
