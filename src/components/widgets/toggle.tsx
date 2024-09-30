import { forwardRef, HTMLAttributes } from 'react'
import { parseNumberWithUnit } from 'some-utils-ts/string/number/parse'

const defaultProps = {
  height: '3/2em',
  aspect: 1.75,
  strokeWidth: '1px',
  padding: '.3em',
  active: false,
  circleActiveFill: 'currentColor',
}

type Props = HTMLAttributes<SVGSVGElement> & Partial<typeof defaultProps>

export const ToggleWidget = forwardRef<SVGSVGElement, Props>(function ToggleWidget(props, ref) {
  const {
    height: heightArg,
    strokeWidth: strokeWidthArg,
    aspect,
    padding,
    active,
    circleActiveFill,
    ...rest
  } = { ...defaultProps, ...props }

  const [heightValue, heightUnit] = parseNumberWithUnit(heightArg)
  // const height = heightValue.toString() + heightUnit
  const height = `${heightValue}${heightUnit}`

  const [strokeWidthValue, strokeWidthUnit] = parseNumberWithUnit(strokeWidthArg)
  const strokeWidth = strokeWidthValue.toString() + strokeWidthUnit

  const h2 = (heightValue / 2).toString() + heightUnit
  const width = (heightValue * aspect).toString() + heightUnit
  const sw2 = (strokeWidthValue / 2).toString() + strokeWidthUnit

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      stroke='currentColor'
      strokeWidth={strokeWidthArg}
      fill='none'
      {...rest}
    >
      <rect
        x={sw2}
        y={sw2}
        rx={h2}
        width={`calc(${width} - ${strokeWidth})`}
        height={`calc(${height} - ${strokeWidth})`}
      />
      <circle
        cx={!active ? h2 : `calc(${width} - ${h2})`}
        cy={h2}
        r={`calc(${h2} - ${sw2} - ${padding})`}
        fill={!active ? 'transparent' : 'currentColor'}
        style={{ transition: '0.2s' }}
      />
    </svg>
  )
})