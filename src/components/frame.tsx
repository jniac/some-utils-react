import { createContext, CSSProperties, forwardRef, HTMLAttributes, useContext, useLayoutEffect, useMemo, useRef } from 'react'

const defaultCoreProps = {
  aspect: 1 as number | null,
  /**
   * The mode of the frame:
   * - `contain`: The content is fully visible, and may be letterboxed.
   * - `cover`: The content occupies the full frame, and may be cropped.
   * 
   * Defaults to `contain`.
   */
  mode: 'contain' as 'contain' | 'cover',
  /**
   * If `scaleContent` is set to true, the content will be scaled to fit the frame.
   * 
   * NOTE: At least one of `baseWidth` or `baseHeight` must be provided.
   */
  scaleContent: false,
  baseWidth: null as number | null,
  baseHeight: null as number | null,
}

const defaultProps = {
  ...defaultCoreProps,

  outColor: 'transparent',
  debug: false as boolean | string,
  frameClassName: '',
}

type SugarProps = Partial<{
  /**
   * The default aspect ratio of the frame.
   * 
   * Sugar syntax for `<Frame mode: "contain" />`.
   */
  contain: boolean
  /**
   * Change the mode of the frame to `cover`.
   * 
   * Sugar syntax for `<Frame mode: "cover" />`.
   */
  cover: boolean
  /**
   * Sugar for `baseWidth` and `baseHeight` declared as an array.
   */
  baseSize: [width?: number, height?: number]
}>

type FrameProps = Partial<typeof defaultProps> & SugarProps & HTMLAttributes<HTMLDivElement>

class Node {
  static nextId = 0
  static instances = new Set<Node>()

  id = Node.nextId++
  outer: HTMLDivElement = null!
  parent: Node | null = null
  props: typeof defaultCoreProps = defaultCoreProps
  children: Node[] = []

  constructor() {
    Node.instances.add(this)
  }

  setOuter(outer: HTMLDivElement) {
    this.outer = outer
    resizeObserver().observe(this.outer)
  }

  isRoot() {
    return this.parent === null
  }

  register(child: Node) {
    if (this.children.indexOf(child) === -1) {
      child.parent = this
      this.children.push(child)
    }
  }

  destroy() {
    this.parent = null
    this.children = []
    Node.instances.delete(this)
    resizeObserver().unobserve(this.outer)
  }
}

/**
 * Lazy initialization of the resize observer, because Next.js and ResizeObserver
 * exists only in the browser.
 */
const resizeObserver = (() => {
  let instance: ResizeObserver
  return () => {
    if (!instance) {
      instance = new ResizeObserver(() => {
        for (const node of Node.instances) {
          checkForUdpate(node)
        }
      })
    }
    return instance
  }
})()

const context = createContext<Node>(null!)

function applyRect(target: HTMLElement, x: number, y: number, width: number, height: number) {
  target.style.left = `${x}px`
  target.style.top = `${y}px`
  target.style.width = `${width}px`
  target.style.height = `${height}px`
}

function update(node: Node) {
  const { outer, props } = node
  const { aspect, mode, scaleContent, baseWidth, baseHeight } = props
  const [inner, bar1, bar2] = outer.children as HTMLCollectionOf<HTMLDivElement>
  const outerWidth = outer.clientWidth
  const outerHeight = outer.clientHeight
  const outerAspect = outerWidth / outerHeight

  if (mode === 'cover') {
    bar1.style.setProperty('display', 'none')
    bar2.style.setProperty('display', 'none')
  } else {
    bar1.style.removeProperty('display')
    bar2.style.removeProperty('display')
  }

  inner.style.removeProperty('transform')
  inner.style.removeProperty('transformOrigin')

  if (aspect === null) {
    inner.style.top = '0'
    inner.style.left = '0'
    inner.style.width = `${outerWidth}px`
    inner.style.height = `${outerHeight}px`

    bar1.style.width = '0'
    bar1.style.height = '0'
    bar2.style.width = '0'
    bar2.style.height = '0'
  } else {
    const fitWidth = mode === 'contain' !== (outerAspect > aspect) // xor

    if (scaleContent === false) {
      if (fitWidth) {
        const height = Math.round(outerWidth / aspect)
        const top = (outerHeight - height) / 2
        applyRect(inner, 0, top, outerWidth, height)
        applyRect(bar1, 0, 0, outerWidth, top)
        applyRect(bar2, 0, top + height, outerWidth, top)
      } else {
        const width = Math.round(outerHeight * aspect)
        const left = (outerWidth - width) / 2
        applyRect(inner, left, 0, width, outerHeight)
        applyRect(bar1, 0, 0, left, outerHeight)
        applyRect(bar2, left + width, 0, left, outerHeight)
      }
    } else {
      if (baseWidth === null && baseHeight === null) {
        throw new Error('At least one of baseWidth or baseHeight must be provided.')
      }

      const width = baseWidth !== null ? baseWidth : baseHeight! * aspect
      const height = baseHeight !== null ? baseHeight : baseWidth! / aspect

      const scaleRatio = baseWidth !== null
        ? (fitWidth ? outerWidth / baseWidth : outerHeight / height)
        : (fitWidth ? outerWidth / width : outerHeight / baseHeight!)

      const left = (outerWidth - width * scaleRatio) / 2
      const top = (outerHeight - height * scaleRatio) / 2

      inner.style.transform = `scale(${scaleRatio})`
      inner.style.transformOrigin = '0 0'
      applyRect(inner, left, top, width, height)

      if (fitWidth) {
        applyRect(bar1, 0, 0, outerWidth, top)
        applyRect(bar2, 0, top + height * scaleRatio, outerWidth, top)
      } else {
        applyRect(bar1, 0, 0, left, outerHeight)
        applyRect(bar2, left + width * scaleRatio, 0, left, outerHeight)
      }
    }
  }
}

/**
 * Since the frame must be updated from the root, we need to store the children
 * in a queue and traverse the tree in a breadth-first manner.
 */
function checkForUdpate(node: Node) {
  if (node.isRoot()) {
    const queue = [node]
    while (queue.length > 0) {
      const current = queue.shift()!
      update(current)
      queue.push(...current.children)
    }
  }
}

const outerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
}

/**
 * The Frame component is a container that maintains a given aspect ratio.
 * 
 * If `scaleContent` is set to true, and one base dimension is provided (
 * `baseWidth` or `baseHeight`), the content will be scaled to fit the frame.
 * 
 * NOTE: 
 * - This has been very painful to write, because layout must be computed
 *   from the root to the leaves, but react works the other way around. This is
 *   why we need to use a dedicated context to store the tree structure.
 * - The frame is composed of 3 divs:
 *   - The first one is the actual content of the frame.
 *   - The second and third are the bars that are displayed when the content
 *   does not fill the frame.
 * - A resize observer is used to update the layout of all the frames when the
 *   window - or some parent - is resized.
 */
export const Frame = forwardRef<HTMLDivElement, FrameProps>((props, ref) => {
  const {
    aspect,
    scaleContent,
    mode: modeArg,
    baseWidth: baseWidthArg,
    baseHeight: baseHeightArg,

    // Sugar props
    contain,
    cover,
    baseSize,

    style,
    className,
    frameClassName,
    outColor,
    debug,
    ...rest
  } = { ...defaultProps, ...props }

  const node = useMemo(() => new Node(), [])
  const mode = contain ? 'contain' : cover ? 'cover' : modeArg
  const baseWidth = baseWidthArg ?? baseSize?.[0] ?? null
  const baseHeight = baseHeightArg ?? baseSize?.[1] ?? null
  node.props = { aspect, mode, scaleContent, baseWidth, baseHeight }

  const parent = useContext(context)
  parent?.register(node)

  const outerRef = useRef<HTMLDivElement>(null)

  // 1. Initialize the node and destroy it when the component is unmounted.
  useLayoutEffect(() => {
    node.setOuter(outerRef.current!)
    return () => node.destroy()
  }, [])

  // 2. Check for update when the aspect or mode changes.
  useLayoutEffect(() => {
    checkForUdpate(node)
  }, [aspect, mode, scaleContent, baseWidth, baseHeight])

  return (
    <context.Provider value={node}>
      <div
        ref={outerRef}
        className={`Frame ${frameClassName} ${debug ? 'debug' : ''}`.trim()}
        style={outerStyle}
      >
        <div
          ref={ref}
          className={className}
          style={{
            ...style,
            position: 'absolute',
          }}
          {...rest}
        />
        <div
          className='Bar'
          style={{
            position: 'absolute',
            backgroundColor: outColor,
            pointerEvents: 'none',
          }}
        />
        <div
          className='Bar'
          style={{
            position: 'absolute',
            backgroundColor: outColor,
            pointerEvents: 'none',
          }}
        />
      </div>
    </context.Provider>
  )
})
