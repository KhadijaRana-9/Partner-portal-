import { useEffect, useRef, useState } from 'react'

// Animates a numeric value from 0 -> target once on mount (or whenever the
// target changes), using an ease-out curve. Pure visual polish — the value
// itself always comes from real data, this just animates how it's revealed.
export function useCountUp(target, { duration = 900 } = {}) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    const numericTarget = Number(target) || 0
    startRef.current = null

    function tick(timestamp) {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(numericTarget * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setValue(numericTarget)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return value
}
