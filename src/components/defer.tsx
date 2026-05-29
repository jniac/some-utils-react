import { useState } from 'react'

import { useEffects } from '../hooks/effects'

type Props = {
  waitFor: `${number}ms` | `${number}frame` | Promise<any>
  children?: React.ReactNode
}

export function Defer(props: Props) {
  const { waitFor, children } = props
  const [ready, setReady] = useState(false)
  useEffects(async function* () {
    if (typeof waitFor === 'string') {
      if (waitFor.endsWith('ms')) {
        const ms = parseInt(waitFor.slice(0, -2))
        await new Promise(resolve => setTimeout(resolve, ms))
      } else if (waitFor.endsWith('frame')) {
        const frames = parseInt(waitFor.slice(0, -5))
        for (let i = 0; i < frames; i++) {
          await new Promise(requestAnimationFrame)
        }
      }
    }
    if (waitFor instanceof Promise) {
      await waitFor
    }
    setReady(true)
  }, [])
  return ready && <>{children}</>
}