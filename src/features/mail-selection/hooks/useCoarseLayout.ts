import { useSyncExternalStore } from 'react'

// Touch screens and narrow windows get the explicit Select mode instead of hover reveal.
const query = '(pointer: coarse), (max-width: 767.98px)'

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const getSnapshot = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia) && window.matchMedia(query).matches

export function useCoarseLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
