import { useLayoutEffect, useState } from 'react'

/**
 * C'mon Next.js. Why "use client" is not enough? Why do I have to write this?
 * 
 * Because "use client" is not enough to prevent rendering on server, that hook,
 * when invoked, will prevent rendering on server.
 * 
 * Usage:
 * ```
 * function MyClientComponent(props: Props) { ... }
 * 
 * function MyComponent(props: Props) {
 *   // Skip rendering on server
 *   return useIsClient() && (
 *     <MyClientComponent {...props} />
 *   )
 * }
 * ```
 */
export function useIsClient() {
  // `useState` is used to prevent rendering on server
  const [isClient, setIsClient] = useState(false)

  useLayoutEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}
