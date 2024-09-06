import { DependencyList, MutableRefObject } from 'react';
import { Destroyable } from 'some-utils-ts/types';
/**
 * What the `useEffects` generator can yield.
 */
type Yieldable = void | null | Destroyable | Destroyable[];
type Callback<T, V = void> = (value: T) => (void | Generator<Yieldable | V, void, any> | AsyncGenerator<Yieldable | V, void, any>);
type Return<T> = {
    ref: MutableRefObject<T>;
};
/** For some reason the DependencyList when imported from react, is marked as `any`, which is not desirable. */
declare const defaultOptions: {
    /**
     * Choose the moment to initialize the effects. Defaults to 'effect'.
     *
     * Reminder:
     * - 'memo': runs before the first render.
     * - 'effect': runs just after the first render and after the browser has painted.
     * - 'layoutEffect': runs just after the first render but before the browser has painted.
     */
    moment: "effect" | "layoutEffect" | "memo";
    /**
     * Use a "smart digest props" heuristic for deps hashing.
     *
     * Defaults to true.
     */
    useDigestProps: boolean;
};
type Options = typeof defaultOptions;
declare function useEffects<T = undefined>(options: Options, callback: Callback<T>, deps: DependencyList | 'always'): Return<T>;
declare function useEffects<T = undefined>(callback: Callback<T>, deps: DependencyList | 'always'): Return<T>;
declare function useLayoutEffects<T = undefined>(callback: (value: T) => Generator<void | Destroyable, void, unknown>, deps: DependencyList | 'always', options?: Omit<Options, 'moment'>): Return<T>;
declare function useMemoEffects<T = undefined>(callback: (value: T) => Generator<void | Destroyable, void, unknown>, deps: DependencyList | 'always', options?: Omit<Options, 'moment'>): Return<T>;
export type { Callback as UseEffectsCallback, Options as UseEffectsOptions, Return as UseEffectsReturn, Yieldable as UseEffectsYieldable };
export { useEffects, useLayoutEffects, useMemoEffects };
