import { useEffects } from '../hooks/effects'

/**
 * Useful for injecting CSS styles into the document head (and unmounting them).
 * 
 * Usage:
 * ```
 * <Style 
 *   css={`
 *     :root {
 *       --my-color: red;
 *     }
 *   `} 
 * />
 * ```
 */
export function Style({ css = '' }) {
  useEffects(function* () {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    yield () => {
      style.remove()
    }
  }, [css])
  return null
}
