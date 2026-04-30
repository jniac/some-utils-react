import { handlePointer } from 'some-utils-dom/handle/pointer'
import { useEffects } from '../hooks/effects'

const defaultProps = {
  onTap: undefined as undefined | (() => void),
}

export function Div(props: Partial<typeof defaultProps> & React.HTMLAttributes<HTMLDivElement>) {
  const {
    onTap,
    ...restProps
  } = props

  const { ref } = useEffects<HTMLDivElement>(function* (div) {
    if (onTap) {
      yield handlePointer(div, {
        onTap,
      })
    }
  }, 'always')

  return <div ref={ref} {...restProps} />
}
