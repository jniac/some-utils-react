import { DependencyList, MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react'

import { Destroyable } from 'some-utils-ts/types'

import { digestProps } from './digest'

let time = 0
let frame = 0

const debounceUnmountPendingEffects = new Set<Effect>()

function animationFrame(ms: number): void {
  time = ms / 1000
  frame++
  requestAnimationFrame(animationFrame)

  for (const effect of debounceUnmountPendingEffects) {
    effect.unmount(UnmountReason.DebounceNextFrame)
  }
  debounceUnmountPendingEffects.clear()
}

if (typeof window !== 'undefined') {
  requestAnimationFrame(animationFrame)
}

enum UnmountReason {
  Regular,
  DebounceNextFrame,
}

let nextEffectId = 0
/**
 * Instance of an effect. Holds the state of the effect.
 * 
 * About the debounce mechanism:
 * - 
 */
class Effect {
  readonly id = nextEffectId++

  mounted = false
  unmountReason = UnmountReason.Regular
  depsId = -1
  mountId = 0
  renderCount = 0
  creationTime = time
  creationFrame = frame
  lastUpdateTime = -1
  lastUpdateFrame = -1

  destroyables: Destroyable[] = []

  toInfoString() {
    const mount = this.mounted ? 'mounted' : `unmounted (${UnmountReason[this.unmountReason]})`
    return `Effect #${this.id} ${mount} (deps, render, mount: ${this.depsId}, ${this.renderCount}, ${this.mountId})`
  }

  ensureUnmounted() {
    if (this.mounted === false) {
      return
    }
    this.unmount()
  }

  unmount(reason = UnmountReason.Regular) {
    if (this.mounted === false) {
      // console.warn(this.toInfoString())
      // console.warn('useEffects: Already unmounted!')
      return
    }

    this.mounted = false
    this.unmountReason = reason

    for (const destroyable of this.destroyables) {
      if (destroyable) {
        if (typeof destroyable === 'object') {
          destroyable.destroy()
        } else {
          destroyable()
        }
      }
    }

    this.destroyables.length = 0
    debounceUnmountPendingEffects.delete(this)
  }
}

/**
 * What the `useEffects` generator can yield.
 */
type Yieldable =
  | void
  | null
  | Destroyable
  | Destroyable[]

type Returnable<V = void> =
  | void
  | Generator<Yieldable | V, void, any>
  | AsyncGenerator<Yieldable | V, void, any>

type Callback<T, V = void> =
  (value: T, effect: Effect) => Returnable<V>

type Args0<T, KeysToOmit extends keyof Options | never = never> = [Omit<Options, KeysToOmit>, Callback<T>, Deps]
type Args1<T> = [Callback<T>, Deps]
type Args<T, KeysToOmit extends keyof Options | never = never> = Args0<T, KeysToOmit> | Args1<T>

function parseArgs<T>(args: Args<T>): Args0<T> {
  if (typeof args[0] === 'object') {
    return args as Args0<T>
  }
  const [arg0, arg1 = 'always'] = args as Args1<T>
  return [{}, arg0, arg1]
}

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
  /**
   * Debounce is an option to prevent the effect from being unmounted and mounted
   * multiple times in one single frame.
   * 
   * It is useful to prevent side effects from the react strict mode in some 
   * situations. 
   * 
   * One example is when using `useMemo` to create a context that can be immediately
   * transmitted to children (eg: a webgl context), and that should be destroyed 
   * when the component is unmounted. If react strict mode is enabled, the component
   * will unmount too early, and the context will be destroyed before the children
   * can use it. (And re-mount will not recreate the context, since the context
   * was created in useMemo).
   * 
   * Defaults to true.
   */
  debounce: true,
}

type Options = Partial<typeof defaultOptions>

function useEffects<T = undefined>(...args: Args<T>): Return<T> {
  const [options, callback, propsDeps] = parseArgs<T>(args)

  const {
    moment,
    useDigestProps,
    debounce,
  } = { ...defaultOptions, ...options }

  const deps = useDigestProps && Array.isArray(propsDeps) && propsDeps.length > 0
    ? [digestProps(propsDeps)]
    : propsDeps === 'always' ? [Math.random()] : propsDeps

  const ref = useRef<T>(null) as MutableRefObject<T>

  const instance = useMemo(() => new Effect(), [])
  const depsId = useMemo(() => instance.depsId + 1, deps)
  if (depsId !== instance.depsId) {
    instance.ensureUnmounted()
    instance.depsId = depsId
    instance.mountId = 0
  }
  instance.renderCount++

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
    instance.mounted = true
    instance.mountId++
    instance.lastUpdateFrame = frame
    instance.lastUpdateTime = time

    // Do not unmount if the component was just created and destroyed in the 
    // same frame, because it will be mounted again in the same frame (react strict mode).
    if (debounce && instance.lastUpdateFrame === frame && instance.mountId > 1) {
      debounceUnmountPendingEffects.delete(instance)
      return
    }

    const it = callback(ref.current, instance)
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
        if (instance.mounted && done === false) {
          if (value) {
            if (Array.isArray(value)) {
              instance.destroyables.push(...value as Destroyable[])
            } else {
              instance.destroyables.push(value as Destroyable)
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
  }, [depsId])

  // Unmount:
  useEffect(() => {
    return () => {
      if (debounce && instance.lastUpdateTime === time) {
        // Do not unmount if the component was just created and destroyed in the 
        // same frame, because it will be mounted again in the same frame (react strict mode).
        if (instance.mountId < 2) {
          debounceUnmountPendingEffects.add(instance)
          return
        }
        // If for some reason the component was unmounted more than twice, throw an error.
        if (instance.mountId > 2) {
          throw new Error('useEffects debounce: Unexpected unmount!')
        }
      }

      instance.unmount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsId])

  return { ref }
}

function useLayoutEffects<T = undefined>(...args: Args<T, 'moment'>): Return<T> {
  const [options, callback, deps] = parseArgs(args)
  return useEffects({ ...options, moment: 'layoutEffect' } as Options, callback, deps)
}

function useMemoEffects<T = undefined>(...args: Args<T, 'moment'>): Return<T> {
  const [options, callback, deps] = parseArgs(args)
  return useEffects({ ...options, moment: 'memo' } as Options, callback, deps)
}

/**
 * Useful for when you want to keep a ref up-to-date with a value (ex a prop),
 * (for example: inside an effect).
 */
function useUpdatedRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value)
  ref.current = value
  return ref
}

export type {
  Callback as UseEffectsCallback,
  Deps as UseEffectsDeps,
  Effect as UseEffectsEffect,
  Options as UseEffectsOptions,
  Return as UseEffectsReturn,
  Returnable as UseEffectsReturnable,
  Yieldable as UseEffectsYieldable
}

export {
  UnmountReason as UseEffectsUnmountReason
}

export {
  useEffects,
  useLayoutEffects,
  useMemoEffects,
  useUpdatedRef
}

