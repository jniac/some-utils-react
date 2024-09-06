/**
 * Safe way to "digest" an object by avoiding common pitfalls (ex: circular references).
 *
 * Since it's intended to be used with React:
 * - function props are reduced to name + length (args count)
 * - object props are handled in a special manner: when an "id" or "uuid" is present
 * subprops are ignored and only the id is taken into account... except if a "value"
 * key is present: if so the only the "value" prop is taken into account anything
 * else being ignored (the object is considered as a wrapper around a value
 * (ex observables))
 */
export declare function digestProps(...propsArray: any[]): number;
