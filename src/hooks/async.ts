import { useEffect, useState } from 'react'

export function useAsync<T>(promise: Promise<T>) {
  const [value, setValue] = useState<T | null>(null)
  useEffect(() => {
    promise.then(setValue)
  }, [])
  return value
}
