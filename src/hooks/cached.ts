import { useMemo, useState } from 'react'

let nextId = 0

export function useCachedState<T>(key: string | boolean | null | undefined, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const uniqueId = useMemo(() => nextId++, [])

  const safeKey = useMemo(() => {
    switch (typeof key) {
      case 'boolean':
        return key ? `cached-state-${uniqueId}` : null
      case 'string':
        return key
      default:
        return null
    }
  }, [key])

  const [state, setState] = useState<T>(() => {
    if (safeKey === null) {
      return defaultValue
    }
    const cached = localStorage.getItem(safeKey)
    return cached ? JSON.parse(cached) as T : defaultValue
  })

  const setCachedState: React.Dispatch<React.SetStateAction<T>> = (value) => {
    setState(prev => {
      const newValue = value instanceof Function ? value(prev) : value
      if (safeKey !== null) {
        localStorage.setItem(safeKey, JSON.stringify(newValue))
      }
      return newValue
    })
  }

  return [state, setCachedState]
}
