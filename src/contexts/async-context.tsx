'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

type InvalidateOptions = {
  cacheMaxAge?: number
}

type InvalidateFunction = (options?: InvalidateOptions) => void

export function createAsyncContext<T>(
  initializer: () => Promise<T>
): [
    Provider: React.FC<{ children?: React.ReactNode }>,
    useContext: () => [context: T, invalidate: InvalidateFunction],
  ] {
  const deferredContext = createContext<[T, InvalidateFunction]>(null!)
  const Provider = ({ children }: { children?: React.ReactNode }) => {
    const [timestamp, setTimestamp] = useState(Date.now())
    const timestampRef = useRef(0)

    const invalidate: InvalidateFunction = (options) => {
      const now = Date.now()
      if (options?.cacheMaxAge) {
        const cacheAge = now - timestampRef.current
        if (cacheAge < options.cacheMaxAge) {
          return
        }
      }
      timestampRef.current = now
      setTimestamp(now)
    }

    const [value, setValue] = useState<T | null>(null)
    useEffect(() => {
      initializer().then(value => {
        timestampRef.current = timestamp
        setValue(value)
      })
    }, [timestamp])

    if (value === null) {
      return null
    }

    return (
      <deferredContext.Provider value={[value, invalidate]}>
        {children}
      </deferredContext.Provider>
    )
  }
  const useDeferredContext = () => {
    const context = useContext(deferredContext)
    if (context === null) {
      throw new Error('Deferred context not initialized')
    }
    return context
  }
  return [Provider, useDeferredContext] as const
}
