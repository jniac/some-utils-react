import { Hash } from 'some-utils-ts/hash';
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
export function digestProps(...propsArray) {
    Hash.init();
    const queue = [...propsArray];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === null || current === undefined) {
            Hash.update(123456);
            continue;
        }
        const type = typeof current;
        switch (type) {
            case 'boolean': {
                Hash.update(37842398 + (current ? 0 : 1));
                break;
            }
            case 'function': {
                Hash.updateString(current.name);
                Hash.update(current.length);
                break;
            }
            case 'string': {
                Hash.updateString(current);
                break;
            }
            case 'number': {
                Hash.update(current);
                break;
            }
            case 'object': {
                // If object has "value" key, object is a wrapper, "value" is important, ignore everything else.
                if ('value' in current) {
                    queue.push(current.value);
                    break;
                }
                // If object has id, the id is enough to deduce identity, ignore everything else.
                if ('uuid' in current) {
                    Hash.updateString(current.uuid);
                    break;
                }
                if ('id' in current) {
                    Hash.updateString(String(current.id));
                    break;
                }
                if (Array.isArray(current)) {
                    queue.push(...current);
                }
                else {
                    for (const [key, value] of Object.entries(current)) {
                        Hash.updateString(key);
                        queue.push(value);
                    }
                }
                break;
            }
        }
    }
    return Hash.getValue();
}
