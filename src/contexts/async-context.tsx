'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export function createAsyncContext<T>(
  initializer: () => Promise<T>
): [
    Provider: React.FC<{ children?: React.ReactNode }>,
    useContext: () => T,
  ] {
  const deferredContext = createContext<T>(null!)
  const Provider = ({ children }: { children?: React.ReactNode }) => {
    const [value, setValue] = useState<T | null>(null)
    useEffect(() => {
      initializer().then(value => {
        setValue(value)
      })
    }, [])
    if (value === null) {
      return null
    }
    return (
      <deferredContext.Provider value={value}>
        {children}
      </deferredContext.Provider>
    )
  }
  const useDeferredContext = () => {
    const value = useContext(deferredContext)
    if (value === null) {
      throw new Error('Deferred context not initialized')
    }
    return value
  }
  return [Provider, useDeferredContext] as const
}
