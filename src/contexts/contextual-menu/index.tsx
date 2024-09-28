import { createContext, ReactNode, useContext, useMemo, useState } from 'react'

import { handleHtmlElementEvent } from 'some-utils-dom/handle/element-event'
import { handlePointer } from 'some-utils-dom/handle/pointer'
import { isAncestorOf } from 'some-utils-dom/utils/tree'

import { useEffects, useLayoutEffects } from '../../hooks/effects'
import { useTriggerRender } from '../../hooks/render'

import style from './style.css'

type ContextualMenuHandlerEntry = {
  key: string,
  label?: ReactNode,
  onClick?: () => void,
}

class ContextualMenuHandler {
  internal = {
    open: false,
    timestamp: 0,
    pointerX: 0,
    pointerY: 0,
    title: 'Contextual Menu',

    setOpen: null! as (open: boolean) => void,
    triggerRender: null! as () => void,
    entries: [] as ContextualMenuHandlerEntry[],
    element: null as HTMLElement | null,
  }

  constructor(triggerRender: () => void) {
    this.internal.triggerRender = triggerRender
  }

  entry(parameters: ContextualMenuHandlerEntry) {
    const { key } = parameters
    const index = this.internal.entries.findIndex(entry => entry.key === key)
    if (index === -1) {
      this.internal.entries.push(parameters)
    } else {
      this.internal.entries[index] = parameters
    }
  }
}

const reactContext = createContext<ContextualMenuHandler>(null!)

function ContextualMenu(props: JSX.IntrinsicElements['div']) {
  const handler = useContextualMenu()
  const { ref } = useLayoutEffects<HTMLDivElement>(function* (div) {
    handler.internal.element = div
    let x = handler.internal.pointerX - 10
    let y = handler.internal.pointerY - 10
    div.style.left = `${x}px`
    div.style.top = `${y}px`
  }, [])
  return (
    <div
      ref={ref}
      {...props}
      className='ContextualMenu'
    >
      <h1>
        {handler.internal.title}
      </h1>

      {handler.internal.entries.map(entry => (
        <button
          key={entry.key}
          onClick={() => {
            entry.onClick?.()
            handler.internal.setOpen(false)
            handler.internal.triggerRender()
          }}
        >
          {entry.label || entry.key}
        </button>
      ))}
    </div>
  )
}

export function useContextualMenu() {
  return useContext(reactContext)
}

type Props = JSX.IntrinsicElements['div'] & {
  contextualMenuStyle?: React.CSSProperties,
}

export function ContextualMenuProvider(props: Props) {
  const triggerRender = useTriggerRender()
  const handler = useMemo(() => new ContextualMenuHandler(triggerRender), [])

  const [open, setOpen] = useState(false)
  handler.internal.open = open
  handler.internal.setOpen = setOpen

  const { ref } = useEffects<HTMLDivElement>(function* (div) {
    const styleElement = document.createElement('style')
    styleElement.textContent = style
    document.head.appendChild(styleElement)
    yield () => styleElement.remove()

    yield handleHtmlElementEvent(div, {
      contextmenu: event => {
        event.preventDefault()
        const rect = div.getBoundingClientRect()
        const { clientX, clientY } = event as MouseEvent
        handler.internal.timestamp = Date.now()
        handler.internal.pointerX = clientX - rect.left
        handler.internal.pointerY = clientY - rect.top
        setOpen(true)
      },
    })

    yield handlePointer(div, {
      onUp: info => {
        if ((info.event as PointerEvent).button !== 0) {
          return
        }

        const timespan = Date.now() - handler.internal.timestamp
        if (timespan > 100 && !isAncestorOf(handler.internal.element, info.event.target)) {
          setOpen(false)
        }
      },
    })
  }, [])

  const { children, contextualMenuStyle, ...rest } = props

  return (
    <reactContext.Provider value={handler}>
      <div ref={ref} {...rest}>
        {children}
        {open && (
          <ContextualMenu style={contextualMenuStyle} />
        )}
      </div>
    </reactContext.Provider>
  )
}