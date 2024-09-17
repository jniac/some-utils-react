/**
 * Useful for creating class names in a declarative way.
 * 
 * ```
 * const selected = true
 * const active = true
 * const hidden = false
 * return (
 *   <div className={makeClassName('Foo', selected && 'highlight', { active, hidden })} />
 * )
 * // => <div class="Foo highlight active" />
 * ```
 * 
 * @param args - A list of strings, booleans, nulls, or undefined values.
 */
export function makeClassName(...args: (string | false | null | undefined | { [key: string]: boolean })[]): string {
  return (
    args
      .filter(item => !!item)
      .map(item => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object') {
          const keys = Object.keys(item)
          return keys.filter(key => item[key] === true)
        }
        throw new Error('Not possible.')
      })
      .flat()
      .join(' ')
  )
}