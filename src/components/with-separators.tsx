type Props<T> = {
  items: T[]
  item: (item: T, index: number) => React.ReactNode
  separator?: (key: string) => React.ReactNode
}

export function WithSeparators<T>(props: Props<T>) {
  const { items, item: itemProp, separator } = props
  return (
    <>
      {items.map((item, index) => (
        <span key={index}>
          {itemProp(item, index)}
          {separator && index < items.length - 1 && separator(`separator-${index}`)}
        </span>
      ))}
    </>
  )
}
