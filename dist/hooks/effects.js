import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { digestProps } from './digest';
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
    moment: 'effect',
    /**
     * Use a "smart digest props" heuristic for deps hashing.
     *
     * Defaults to true.
     */
    useDigestProps: true,
};
function parseArgs(args) {
    const [arg0, arg1, arg2] = args;
    if (typeof arg0 === 'object') {
        return [arg1, arg2, arg0];
    }
    return [arg0, arg1 !== null && arg1 !== void 0 ? arg1 : 'always', arg2 !== null && arg2 !== void 0 ? arg2 : {}];
}
let nextId = 0;
function useEffects(...args) {
    const [callback, propsDeps, options] = parseArgs(args);
    const { moment = 'effect', useDigestProps = true, } = options;
    const deps = useDigestProps && Array.isArray(propsDeps) && propsDeps.length > 0
        ? [digestProps(propsDeps)]
        : propsDeps === 'always' ? [Math.random()] : propsDeps;
    const ref = useRef(null);
    const { state, destroyables } = useMemo(() => {
        return {
            state: { id: nextId++, mounted: true },
            destroyables: [],
        };
    }, []);
    // Mount:
    const use = {
        'effect': useEffect,
        'layoutEffect': useLayoutEffect,
        'memo': useMemo,
    }[moment];
    use(() => {
        // NOTE: Because of react strict mode, where a same component can be mounted 
        // twice, but sharing the same references through hooks (useMemo, useRef, etc),
        // we need to set "mounted" back to true, otherwise the first unmount will 
        // affect the second component. 
        state.mounted = true;
        const it = callback(ref.current);
        if (it) {
            let previousValue = undefined;
            const extractDestroyableValue = (destroyable) => {
                return typeof destroyable === 'object' ? destroyable.value : undefined;
            };
            const extractPreviousValue = () => {
                if (!previousValue)
                    return undefined;
                if (Array.isArray(previousValue)) {
                    return previousValue.map(extractDestroyableValue);
                }
                return extractDestroyableValue(previousValue);
            };
            const handleResult = (result) => {
                const { value, done } = result;
                previousValue = value;
                if (state.mounted && done === false) {
                    if (value) {
                        if (Array.isArray(value)) {
                            destroyables.push(...value);
                        }
                        else {
                            destroyables.push(value);
                        }
                    }
                    nextResult();
                }
            };
            const nextResult = () => {
                const result = it.next(extractPreviousValue());
                if (result instanceof Promise) {
                    result.then(awaitedResult => {
                        handleResult(awaitedResult);
                    });
                }
                else {
                    handleResult(result);
                }
            };
            nextResult();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    // Unmount:
    useEffect(() => {
        return () => {
            state.mounted = false;
            for (const destroyable of destroyables) {
                if (destroyable) {
                    if (typeof destroyable === 'object') {
                        destroyable.destroy();
                    }
                    else {
                        destroyable();
                    }
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return { ref };
}
function useLayoutEffects(callback, deps, options) {
    return useEffects(Object.assign(Object.assign({}, options), { moment: 'layoutEffect' }), callback, deps);
}
function useMemoEffects(callback, deps, options) {
    return useEffects(Object.assign(Object.assign({}, options), { moment: 'memo' }), callback, deps);
}
export { useEffects, useLayoutEffects, useMemoEffects };
