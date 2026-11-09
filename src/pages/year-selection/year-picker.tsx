import { useEffect, useEffectEvent, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Accumulated distance (px) needed to move one year. Trackpads emit many
// small wheel events; without a threshold one flick skipped a dozen years.
const WHEEL_STEP = 60
const DRAG_STEP = 40

const slide = {
  enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -24, opacity: 0 }),
}

type YearPickerProps = {
  value: number
  min: number
  max: number
  /** +1 / -1: direction of the last change, drives the slide animation. */
  direction: number
  onChange: (year: number) => void
  /** Enter key. */
  onConfirm: () => void
  autoFocus?: boolean
  labels: { picker: string; previous: string; next: string }
}

/**
 * Horizontal year picker exposed as an ARIA spinbutton: ←/↓ previous year,
 * →/↑ next year, PageUp/PageDown ±10, Home/End bounds, Enter confirms. Mouse
 * wheel and horizontal drag/swipe also step through years.
 */
export function YearPicker({
  value,
  min,
  max,
  direction,
  onChange,
  onConfirm,
  autoFocus,
  labels,
}: YearPickerProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const wheelDelta = useRef(0)
  const drag = useRef<{ x: number; delta: number; moved: boolean } | null>(null)

  function goTo(year: number) {
    const next = Math.min(max, Math.max(min, year))
    if (next !== value) onChange(next)
  }

  function handleKey(e: { key: string; preventDefault: () => void }) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        goTo(value - 1)
        break
      case 'ArrowRight':
      case 'ArrowUp':
        goTo(value + 1)
        break
      case 'PageDown':
        goTo(value - 10)
        break
      case 'PageUp':
        goTo(value + 10)
        break
      case 'Home':
        goTo(min)
        break
      case 'End':
        goTo(max)
        break
      case 'Enter':
        onConfirm()
        break
      default:
        return
    }
    e.preventDefault()
  }

  // Shortcuts also work when nothing has focus (e.g. after a click on the
  // background) — but never while a button or link has focus, so Enter on
  // a quick-access year can't confirm the previous year.
  const onWindowKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target === document.body) handleKey(e)
  })
  // React registers wheel listeners as passive: preventDefault (to stop the
  // page from scrolling) needs a native, non-passive listener.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault()
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    wheelDelta.current += delta
    if (Math.abs(wheelDelta.current) >= WHEEL_STEP) {
      goTo(value + Math.sign(wheelDelta.current))
      wheelDelta.current = 0
    }
  })

  useEffect(() => {
    const surface = surfaceRef.current
    const keyListener = (e: KeyboardEvent) => onWindowKey(e)
    const wheelListener = (e: WheelEvent) => onWheel(e)
    window.addEventListener('keydown', keyListener)
    surface?.addEventListener('wheel', wheelListener, { passive: false })
    return () => {
      window.removeEventListener('keydown', keyListener)
      surface?.removeEventListener('wheel', wheelListener)
    }
  }, [])

  useEffect(() => {
    if (autoFocus) surfaceRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    d.delta += d.x - e.clientX // dragging left reveals the next year
    d.x = e.clientX
    if (Math.abs(d.delta) >= DRAG_STEP) {
      goTo(value + Math.sign(d.delta))
      d.delta = 0
      d.moved = true
    }
  }

  function pickNeighbour(year: number) {
    if (!drag.current?.moved) goTo(year)
  }

  return (
    <div className='flex items-center gap-3'>
      <StepButton
        icon={ChevronLeft}
        label={labels.previous}
        disabled={value <= min}
        onClick={() => goTo(value - 1)}
      />

      <div
        ref={surfaceRef}
        role='spinbutton'
        tabIndex={0}
        aria-label={labels.picker}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={String(value)}
        onKeyDown={handleKey}
        onPointerDown={(e) => {
          if (e.button === 0)
            drag.current = { x: e.clientX, delta: 0, moved: false }
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => setTimeout(() => (drag.current = null))}
        onPointerCancel={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        className='relative flex h-16 min-w-0 flex-1 cursor-grab touch-pan-y items-center overflow-hidden rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/25 active:cursor-grabbing'
      >
        <AnimatePresence initial={false} custom={direction} mode='popLayout'>
          <motion.div
            key={value}
            custom={direction}
            variants={slide}
            initial='enter'
            animate='center'
            exit='exit'
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className='grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4'
          >
            <Neighbour
              year={value - 1}
              hidden={value - 1 < min}
              className='justify-self-end'
              onPick={pickNeighbour}
            />
            <span className='text-4xl font-semibold tracking-tight text-primary tabular-nums sm:text-5xl'>
              {value}
            </span>
            <Neighbour
              year={value + 1}
              hidden={value + 1 > max}
              className='justify-self-start'
              onPick={pickNeighbour}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <StepButton
        icon={ChevronRight}
        label={labels.next}
        disabled={value >= max}
        onClick={() => goTo(value + 1)}
      />
    </div>
  )
}

type NeighbourProps = {
  year: number
  hidden: boolean
  className: string
  onPick: (year: number) => void
}

// Mouse shortcut only: keyboard and screen-reader users step with the
// spinbutton, which must not contain other interactive elements. Hidden on
// phones, where three years don't fit between the arrows.
function Neighbour({ year, hidden, className, onPick }: NeighbourProps) {
  return (
    <span
      aria-hidden
      onClick={hidden ? undefined : () => onPick(year)}
      className={cn(
        'hidden cursor-pointer text-2xl font-medium text-muted-foreground/45 tabular-nums transition-colors hover:text-muted-foreground sm:block',
        hidden && 'invisible',
        className
      )}
    >
      {year}
    </span>
  )
}

type StepButtonProps = React.ComponentProps<'button'> & {
  icon: LucideIcon
  label: string
}

function StepButton({ icon: Icon, label, ...props }: StepButtonProps) {
  return (
    <button
      type='button'
      aria-label={label}
      className='flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-40'
      {...props}
    >
      <Icon className='size-4' aria-hidden />
    </button>
  )
}
