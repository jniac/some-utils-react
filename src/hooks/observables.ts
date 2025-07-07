'use client'

import { useEffect, useState } from 'react'

import { Observable } from 'some-utils-ts/observables'

let counter = 0

export function useObservableValue<T>(observable: Observable<T>): T {
  const [, setState] = useState(counter)
  useEffect(() => {
    const { destroy } = observable.onChange(() => setState(++counter))
    return destroy
  }, [observable.observableId]) // Update when the observable changes
  return observable.value
}
