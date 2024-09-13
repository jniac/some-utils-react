import { DependencyList, MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'

import { Destroyable } from 'some-utils-ts/types'

import { digestProps } from './digest'

type State = {
  readonly id: number
  readonly mounted: boolean
  readonly renderCount: number
}

/**
 * What the `useEffects` generator can yield.
 */
type Yieldable = void | null | Destroyable | Destroyable[]

type Callback<T, V = void> =
  (value: T, state: State) => (
    | void
    | Generator<Yieldable | V, void, any>
    | AsyncGenerator<Yieldable | V, void, any>
  )

type Return<T> = {
  ref: MutableRefObject<T>
}

type Deps = DependencyList | 'always'

/** For some reason the DependencyList when imported from react, is marked as `any`, which is not desirable. */
// type DependencyList = readonly unknown[]

const defaultOptions = {
  /**
   * Choose the moment to initialize the effects. Defaults to 'effect'.
   * 
   * Reminder:
   * - 'memo': runs before the first render.
   * - 'effect': runs just after the first render and after the browser has painted.
   * - 'layoutEffect': runs just after the first render but before the browser has painted.
   */
  moment: 'effect' as 'effect' | 'layoutEffect' | 'memo',
  /**
   * Use a "smart digest props" heuristic for deps hashing: references are ignored,
   * instead each primitive value is hashed in order to create a unique key.
   * 
   * If the tree of props is too deep, it can be expensive to crawl through it,
   * and choose to compare references instead.
   * 
   * Defaults to true.
   */
  useDigestProps: true,
}

type Options = typeof defaultOptions

function parseArgs<T>(args: any[]): [Callback<T>, Deps, Options] {
  const [arg0, arg1, arg2] = args
  if (typeof arg0 === 'object') {
    return [arg1, arg2, arg0]
  }
  return [arg0, arg1 ?? 'always', arg2 ?? {}]
}

let nextId = 0

function useEffects<T = undefined>(
  options: Options,
  callback: Callback<T>,
  deps: Deps,
): Return<T>

function useEffects<T = undefined>(
  callback: Callback<T>,
  deps: Deps,
): Return<T>

function useEffects<T = undefined>(...args: any[]): Return<T> {
  const [callback, propsDeps, options] = parseArgs<T>(args)

  const {
    moment,
    useDigestProps,
  } = { ...defaultOptions, ...options }

  const deps = useDigestProps && Array.isArray(propsDeps) && propsDeps.length > 0
    ? [digestProps(propsDeps)]
    : propsDeps === 'always' ? [Math.random()] : propsDeps

  const ref = useRef<T>(null) as MutableRefObject<T>

  const { state, destroyables } = useMemo(() => {
    const id = nextId++
    return {
      state: {
        id,
        mounted: true,
        renderCount: 0,
      },
      destroyables: <Destroyable[]>[],
    }
  }, [])

  state.renderCount++

  // Mount:
  const use = {
    'effect': useEffect,
    'layoutEffect': useLayoutEffect,
    'memo': useMemo,
  }[moment]
  use(() => {
    // NOTE: Because of react strict mode, where a same component can be mounted 
    // twice, but sharing the same references through hooks (useMemo, useRef, etc),
    // we need to set "mounted" back to true, otherwise the first unmount will 
    // affect the second component. 
    state.mounted = true

    const it = callback(ref.current, { ...state })
    if (it) {
      let previousValue: Yieldable = undefined
      const extractDestroyableValue = (destroyable: Destroyable) => {
        return typeof destroyable === 'object' ? destroyable.value : undefined
      }
      const extractPreviousValue = () => {
        if (!previousValue) return undefined
        if (Array.isArray(previousValue)) {
          return previousValue.map(extractDestroyableValue)
        }
        return extractDestroyableValue(previousValue)
      }

      const handleResult = (result: IteratorResult<Yieldable, void>) => {
        const { value, done } = result
        previousValue = value
        if (state.mounted && done === false) {
          if (value) {
            if (Array.isArray(value)) {
              destroyables.push(...value as Destroyable[])
            } else {
              destroyables.push(value as Destroyable)
            }
          }
          nextResult()
        }
      }

      const nextResult = () => {
        const result = it.next(extractPreviousValue())
        if (result instanceof Promise) {
          result.then(awaitedResult => {
            handleResult(awaitedResult)
          })
        } else {
          handleResult(result)
        }
      }

      nextResult()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Unmount:
  useEffect(() => {
    return () => {
      state.mounted = false

      for (const destroyable of destroyables) {
        if (destroyable) {
          if (typeof destroyable === 'object') {
            destroyable.destroy()
          } else {
            destroyable()
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ref }
}

function useLayoutEffects<T = undefined>(
  callback: (value: T) => Generator<void | Destroyable, void, unknown>,
  deps: Deps,
  options?: Omit<Options, 'moment'>
): Return<T> {
  return useEffects({ ...options, moment: 'layoutEffect' } as Options, callback, deps)
}

function useMemoEffects<T = undefined>(
  callback: (value: T) => Generator<void | Destroyable, void, unknown>,
  deps: Deps,
  options?: Omit<Options, 'moment'>
): Return<T> {
  return useEffects({ ...options, moment: 'memo' } as Options, callback, deps)
}

export type {
  Callback as UseEffectsCallback,
  Deps as UseEffectsDeps,
  Options as UseEffectsOptions,
  Return as UseEffectsReturn,
  State as UseEffectsState,
  Yieldable as UseEffectsYieldable
}

export {
  useEffects,
  useLayoutEffects,
  useMemoEffects
}

