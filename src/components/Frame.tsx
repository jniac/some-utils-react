import { createContext, CSSProperties, forwardRef, HTMLAttributes, useContext, useLayoutEffect, useMemo, useRef } from 'react'

const defaultCoreProps = {
  aspect: 1 as number | null,
  mode: 'contain' as 'contain' | 'cover',
}

const defaultProps = {
  ...defaultCoreProps,
  outColor: 'transparent',
  debug: false as boolean | string,
}

type FrameProps = Partial<typeof defaultProps> & HTMLAttributes<HTMLDivElement>

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
    resizeObserver.observe(this.outer)

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
    resizeObserver.unobserve(this.outer)
  }
}

const resizeObserver = new ResizeObserver(() => {
  for (const node of Node.instances) {
    checkForUdpate(node)
  }
})

const context = createContext<Node>(null!)

function update(node: Node) {
  const { outer, props: { aspect, mode } } = node
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
    // xor
    if (mode === 'contain' !== (outerAspect > aspect)) {
      const height = Math.round(outerWidth / aspect)
      const top = (outerHeight - height) / 2

      inner.style.top = `${top}px`
      inner.style.left = '0'
      inner.style.width = `${outerWidth}px`
      inner.style.height = `${height}px`

      bar1.style.left = '0'
      bar1.style.top = '0'
      bar1.style.width = `${outerWidth}px`
      bar1.style.height = `${top}px`

      bar2.style.left = '0'
      bar2.style.top = `${top + height}px`
      bar2.style.width = `${outerWidth}px`
      bar2.style.height = `${top}px`
    } else {
      const width = Math.round(outerHeight * aspect)
      const left = (outerWidth - width) / 2

      inner.style.top = '0'
      inner.style.left = `${left}px`
      inner.style.width = `${width}px`
      inner.style.height = `${outerHeight}px`

      bar1.style.left = '0'
      bar1.style.top = '0'
      bar1.style.width = `${left}px`
      bar1.style.height = `${outerHeight}px`

      bar2.style.left = `${left + width}px`
      bar2.style.top = '0'
      bar2.style.width = `${left}px`
      bar2.style.height = `${outerHeight}px`
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
    mode,
    style,
    outColor,
    debug,
    ...rest
  } = { ...defaultProps, ...props }

  const node = useMemo(() => new Node(), [])
  node.props = { aspect, mode }

  const parent = useContext(context)
  parent?.register(node)

  const outerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    node.setOuter(outerRef.current!)
    checkForUdpate(node)
  }, [aspect, mode])

  return (
    <context.Provider value={node}>
      <div
        ref={outerRef}
        className='Frame'
        style={outerStyle}
      >
        <div
          ref={ref}
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
          }}
        />
        <div
          className='Bar'
          style={{
            position: 'absolute',
            backgroundColor: outColor,
          }}
        />
      </div>
    </context.Provider>
  )
})
