import { ReactElement, ReactNode, isValidElement } from 'react'

type SwitchProps<T> = {
  value: T
  children: ReactNode
}

type CaseProps<T> = {
  when: T | ((value: T) => boolean)
  children: ReactNode
}

type DefaultProps = {
  children: ReactNode
}

/**
 * ⚠️ Experimental: This has not been tested.
 */
export function Switch<T extends string | number | object>({ value, children }: SwitchProps<T>): ReactNode {
  let match: ReactNode = null

  // Flatten children and find the first match
  const childArray = Array.isArray(children) ? children : [children]
  for (const child of childArray) {
    if (!isValidElement(child)) continue

    if ((child.type as any).displayName === 'Case') {
      const { when } = child.props as CaseProps<T>
      const isMatch = typeof when === 'function' ? when(value) : when === value
      if (isMatch) {
        match = (child as any).props.children
        break
      }
    }
  }

  // If no match, check for default
  if (!match) {
    const defaultChild = childArray.find(
      (c) => isValidElement(c) && (c.type as any).displayName === 'Default'
    )
    if (defaultChild) {
      match = (defaultChild as ReactElement<DefaultProps>).props.children
    }
  }

  return match
}

Switch.displayName = 'Switch'

export function Case<T>({ children }: CaseProps<T>) {
  return children
}

Case.displayName = 'Case'

export function Default({ children }: DefaultProps) {
  return children
}

Default.displayName = 'Default'