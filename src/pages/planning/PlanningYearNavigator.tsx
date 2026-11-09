import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function PlanningYearNavigator({ value, onChange }: {
  value: number
  onChange: (year: number) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const lastScroll = useRef(0)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!delta) return
      const next = value + (delta > 0 ? 1 : -1)
      if (next < 2025 || next > 2100) return
      event.preventDefault()
      if (Date.now() - lastScroll.current < 350) return
      lastScroll.current = Date.now()
      onChange(next)
    }
    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [value, onChange])

  function move(direction: number) {
    const next = value + direction
    if (next >= 2025 && next <= 2100) onChange(next)
  }

  return <div ref={container} role="group" aria-label="Année de planification"
    title="Année précédente ou suivante · flèches du clavier ou molette"
    className="inline-flex h-9 items-center rounded-lg border border-border bg-background text-foreground"
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        move(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }}>
    <button type="button" aria-label="Année précédente" disabled={value <= 2025}
      onClick={() => move(-1)} className="h-full rounded-l-lg px-2 hover:bg-muted disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-primary">
      <ChevronLeft size={16} />
    </button>
    <span className="min-w-16 px-2 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
    <button type="button" aria-label="Année suivante" disabled={value >= 2100}
      onClick={() => move(1)} className="h-full rounded-r-lg px-2 hover:bg-muted disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-primary">
      <ChevronRight size={16} />
    </button>
  </div>
}
