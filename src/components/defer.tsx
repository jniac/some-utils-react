import { useState } from 'react'

import { useEffects } from '../hooks/effects'

type Props = {
  waitFor?:
  | `${number}ms`
  | `${number}s`
  | `${number}${'frame' | 'frames' | 'f'}`
  | Promise<any>
  children?: React.ReactNode
}

export function Defer(props: Props) {
  const {
    waitFor = '1frame',
    children
  } = props

  const [ready, setReady] = useState(false)

  useEffects(async function* () {
    if (typeof waitFor === 'string') {
      if (/\d+ms/.test(waitFor)) {
        const ms = parseInt(waitFor.slice(0, -2))
        await new Promise(resolve => setTimeout(resolve, ms))
      }

      else if (/\d+(?:\.\d+)?s/.test(waitFor)) {
        const s = parseFloat(waitFor.slice(0, -1))
        await new Promise(resolve => setTimeout(resolve, s * 1000))
      }

      else if (/\d+(?:\.\d+)?(?:frame|frames|f)/.test(waitFor)) {
        const frames = parseInt(waitFor.replace(/\D/g, ''))
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