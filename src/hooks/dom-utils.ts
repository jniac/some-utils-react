import { useEffect } from 'react'

export function useStyle(style: string) {
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = style
    document.head.appendChild(styleElement)
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [style])
}

export function useTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    const onFocus = () => {
      document.title = title
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.title = previousTitle
    }
  }, [title])
}
