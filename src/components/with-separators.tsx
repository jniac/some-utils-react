
export function WithSeparators<T>(props: { items: T[]; item: (item: T) => React.ReactNode; separator?: (key: string) => React.ReactNode }) {
  const { items, item, separator } = props
  return (
    <>
      {items.map((i, index) => (
        <span key={index}>
          {item(i)}
          {separator && index < items.length - 1 && separator(`separator-${index}`)}
        </span>
      ))}
    </>
  )
}
