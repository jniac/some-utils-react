import { createContext, useContext, useMemo } from 'react'

export function createClassContext<T>(initialValue: new () => T) {
  const Context = createContext<T>(null!)
  const Provider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const instance = useMemo(() => new initialValue(), [])
    return (
      <Context.Provider value={instance}>
        {children}
      </Context.Provider>
    )
  }
  const useClassContext = () => {
    const context = useContext(Context)
    if (!context) {
      throw new Error('useClassContext must be used within a Provider')
    }
    return [context]
  }
  return [Provider, useClassContext] as const
}
