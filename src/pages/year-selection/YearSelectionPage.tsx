import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, ChevronUp, ChevronDown } from 'lucide-react'
import { usePlanningYearStore } from '@/store/planningYearStore'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'

const S = {
  navy:      '#162B6E',
  blue:      '#1E3A8A',
  dark:      '#0A0F1C',
  gray:      '#5A6472',
  border:    '#E0E4E8',
  bg:        '#F5F6F8',
  navyLight: '#EEF3FB',
  white:     '#FFFFFF',
}

const MIN_YEAR = 2025
const MAX_YEAR = 2100

function isoWeeksInYear(y: number) {
  const end   = new Date(y, 11, 28).getDay() || 7
  const start = new Date(y, 0, 4).getDay()  || 7
  return end >= 4 ? 53 : start === 4 ? 53 : 52
}
function workDaysInYear(y: number) {
  let n = 0
  for (let m = 0; m < 12; m++) {
    const days = new Date(y, m + 1, 0).getDate()
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m, d).getDay()
      if (dow !== 0 && dow !== 6) n++
    }
  }
  return n
}

// ── Slot config: offsets relative to center ────────────────────────────────
// offset: -2 = two above, -1 = one above, 0 = center, 1 = one below, 2 = two below
const SLOTS = [-2, -1, 0, 1, 2]
const SLOT: Record<number, { size: number; weight: number; opacity: number; y: number }> = {
  '-2': { size: 22,  weight: 400, opacity: 0.10, y: -140 },
  '-1': { size: 36,  weight: 500, opacity: 0.30, y: -72  },
   '0': { size: 100, weight: 900, opacity: 1.00, y: 0    },
   '1': { size: 36,  weight: 500, opacity: 0.30, y: 72   },
   '2': { size: 22,  weight: 400, opacity: 0.10, y: 140  },
}

export default function YearSelectionPage() {
  const navigate     = useNavigate()
  const t            = useT().yearSelection
  const nom          = useAuthStore(s => s.user?.nom) ?? ''
  const { selectedYear: storedYear, setSelectedYear } = usePlanningYearStore()

  const [year, setYear]           = useState(storedYear ?? new Date().getFullYear())
  const [dir,  setDir]            = useState(0)   // +1 = going forward, -1 = going back
  const [confirming, setConfirming] = useState(false)
  const dragRef = useRef<number | null>(null)
  const accumRef = useRef(0)

  const weeks    = isoWeeksInYear(year)
  const workDays = workDaysInYear(year)

  function change(delta: number) {
    const next = year + delta
    if (next < MIN_YEAR || next > MAX_YEAR) return
    setDir(delta > 0 ? 1 : -1)
    setYear(next)
  }

  async function confirm(chosen = year) {
    if (confirming) return
    setConfirming(true)
    setSelectedYear(chosen)
    await new Promise(r => setTimeout(r, 220))
    navigate({ to: '/dashboard' })
  }

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp')   change(-1)
      if (e.key === 'ArrowDown') change(+1)
      if (e.key === 'Enter')     confirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [year, confirming])

  // Wheel
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    change(e.deltaY > 0 ? 1 : -1)
  }

  // Drag / touch
  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = e.clientY
    accumRef.current = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragRef.current === null) return
    const dy = dragRef.current - e.clientY
    accumRef.current += dy
    dragRef.current = e.clientY
    if (accumRef.current >  44) { change(+1); accumRef.current = 0 }
    if (accumRef.current < -44) { change(-1); accumRef.current = 0 }
  }
  function onPointerUp() { dragRef.current = null }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex',
      background: S.white,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ══ LEFT PANEL ═══════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ x: -32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '36%', minWidth: 260, flexShrink: 0,
          background: `linear-gradient(160deg, ${S.navy} 0%, ${S.blue} 60%, #0F2966 100%)`,
          padding: '52px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: [
            'repeating-linear-gradient(rgba(255,255,255,0.035) 0px, transparent 1px, transparent 48px)',
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0px, transparent 1px, transparent 48px)',
          ].join(', '),
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 40, paddingBottom: 24,
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}>
            <CalendarDays size={15} style={{ color: 'rgba(255,255,255,0.65)' }} />
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.15em',
              color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase',
            }}>SAP Africa Planning</span>
          </div>

          <div style={{
            fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 800,
            color: S.white, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 8,
          }}>
            {t.greeting} {nom}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 28, lineHeight: 1.55 }}>
            {t.tagline}
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.58)', lineHeight: 1.7 }}>
            {t.description}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 28 }}>
            {t.features.map((f: string) => (
              <span key={f} style={{
                padding: '4px 13px', borderRadius: 100,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.16)',
                fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
                color: 'rgba(255,255,255,0.78)',
              }}>{f}</span>
            ))}
          </div>
        </div>

        <p style={{
          position: 'relative', zIndex: 1,
          fontSize: 11, color: 'rgba(255,255,255,0.22)',
          letterSpacing: '.05em', margin: 0,
        }}>© 2025 SEIDOR · SAP Africa Planning</p>
      </motion.div>

      {/* ══ RIGHT PANEL ══════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          flex: 1, background: S.bg,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 48px', gap: 0,
        }}
      >
        {/* Step label */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: S.navyLight, border: `1px solid rgba(22,43,110,0.14)`,
          borderRadius: 100, padding: '4px 14px', marginBottom: 18,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.navy }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.14em',
            color: S.navy, textTransform: 'uppercase',
          }}>{t.step}</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 800,
          color: S.dark, letterSpacing: '-.025em',
          margin: '0 0 4px', textAlign: 'center',
        }}>{t.title}</h1>
        <p style={{
          fontSize: 13, color: S.gray, margin: '0 0 32px',
          textAlign: 'center', lineHeight: 1.5,
        }}>{t.subtitle}</p>

        {/* ── Roller ──────────────────────────────────────────────────────── */}
        <div style={{
          background: S.white,
          border: `1px solid ${S.border}`,
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,51,160,0.08)',
          width: '100%', maxWidth: 400,
          display: 'flex', alignItems: 'center', gap: 0,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {/* Up button */}
          <button
            onClick={() => change(-1)}
            disabled={year <= MIN_YEAR}
            style={{
              width: 52, alignSelf: 'stretch', flexShrink: 0,
              background: 'none', border: 'none',
              borderRight: `1px solid ${S.border}`,
              color: year <= MIN_YEAR ? S.border : S.navy,
              cursor: year <= MIN_YEAR ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { if (year > MIN_YEAR) (e.currentTarget as HTMLElement).style.background = S.navyLight }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
          >
            <ChevronUp size={20} />
          </button>

          {/* Drum cylinder */}
          <div
            style={{
              flex: 1, height: 320, position: 'relative',
              cursor: 'grab', userSelect: 'none', overflow: 'hidden',
            }}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* Top + bottom fade masks */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
              background: `linear-gradient(to bottom,
                ${S.white} 0%,
                rgba(255,255,255,0) 22%,
                rgba(255,255,255,0) 78%,
                ${S.white} 100%)`,
            }} />

            {/* Center highlight band */}
            <div style={{
              position: 'absolute', left: 0, right: 0,
              top: 'calc(50% - 58px)', height: 116,
              background: S.navyLight,
              borderTop: `1px solid rgba(22,43,110,0.10)`,
              borderBottom: `1px solid rgba(22,43,110,0.10)`,
              zIndex: 1, pointerEvents: 'none',
            }} />

            {/* Year slots */}
            {SLOTS.map(offset => {
              const displayYear = year + offset
              const cfg = SLOT[String(offset) as keyof typeof SLOT]
              const isValid = displayYear >= MIN_YEAR && displayYear <= MAX_YEAR

              return (
                <div
                  key={offset}
                  style={{
                    position: 'absolute', left: 0, right: 0, top: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: `translateY(calc(-50% + ${cfg.y}px))`,
                    opacity: isValid ? cfg.opacity : 0,
                    pointerEvents: isValid && offset !== 0 ? 'auto' : 'none',
                    cursor: isValid && offset !== 0 ? 'pointer' : 'default',
                    zIndex: offset === 0 ? 3 : 0,
                  }}
                  onClick={() => isValid && offset !== 0 && change(offset)}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={displayYear}
                      initial={{ y: dir > 0 ? 28 : -28, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{   y: dir > 0 ? -28 : 28, opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: 'block',
                        fontSize: cfg.size,
                        fontWeight: cfg.weight,
                        lineHeight: 1,
                        color: offset === 0 ? S.navy : S.gray,
                        letterSpacing: offset === 0 ? '-0.04em' : '-0.01em',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {isValid ? displayYear : ''}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Down button */}
          <button
            onClick={() => change(+1)}
            disabled={year >= MAX_YEAR}
            style={{
              width: 52, alignSelf: 'stretch', flexShrink: 0,
              background: 'none', border: 'none',
              borderLeft: `1px solid ${S.border}`,
              color: year >= MAX_YEAR ? S.border : S.navy,
              cursor: year >= MAX_YEAR ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { if (year < MAX_YEAR) (e.currentTarget as HTMLElement).style.background = S.navyLight }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
          >
            <ChevronDown size={20} />
          </button>
        </div>

        {/* Stats pill */}
        <AnimatePresence mode="wait">
          <motion.div
            key={year}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: S.white, border: `1px solid ${S.border}`,
              borderRadius: 100, padding: '8px 20px',
              marginBottom: 24,
              boxShadow: '0 2px 8px rgba(0,51,160,0.05)',
            }}
          >
            <span style={{ fontSize: 13, color: S.gray }}>
              <strong style={{ color: S.navy, fontWeight: 700 }}>{weeks}</strong> {t.weeks}
            </span>
            <span style={{ color: S.border }}>·</span>
            <span style={{ fontSize: 13, color: S.gray }}>
              <strong style={{ color: S.navy, fontWeight: 700 }}>{workDays}</strong> {t.workDays}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Quick access */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: S.border }} />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.14em',
              color: S.gray, textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>{t.quickAccess}</span>
            <div style={{ flex: 1, height: 1, background: S.border }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i).map(y => {
              const isActive = year === y
              return (
                <motion.button
                  key={y}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setDir(y > year ? 1 : -1); setYear(y) }}
                  style={{
                    padding: '6px 16px', borderRadius: 100,
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    border: `1px solid ${isActive ? 'rgba(22,43,110,0.28)' : S.border}`,
                    background: isActive ? S.navyLight : S.white,
                    color: isActive ? S.navy : S.gray,
                    cursor: 'pointer', transition: 'all .15s',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >{y}</motion.button>
              )
            })}
          </div>
        </div>

        {/* Launch button */}
        <motion.button
          whileHover={confirming ? {} : { boxShadow: '0 8px 32px rgba(22,43,110,0.38)' }}
          whileTap={confirming ? {} : { scale: 0.99 }}
          onClick={() => confirm()}
          disabled={confirming}
          style={{
            width: '100%', maxWidth: 400, height: 54,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${S.navy}, ${S.blue})`,
            border: 'none', color: S.white,
            fontSize: 15, fontWeight: 700, letterSpacing: '.01em',
            cursor: confirming ? 'default' : 'pointer',
            boxShadow: '0 4px 20px rgba(22,43,110,0.28)',
            opacity: confirming ? 0.75 : 1,
            transition: 'opacity .2s, box-shadow .2s',
            marginBottom: 14,
          }}
        >
          {confirming ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: S.white,
                }}
              />
              {t.loading}
            </>
          ) : (
            <>
              {t.launch} {year}
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>

        {/* Keyboard hint */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, flexWrap: 'wrap',
        }}>
          {(['↑', '↓', '↩'] as const).map(k => (
            <kbd key={k} style={{
              fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
              color: S.gray, background: S.white, border: `1px solid ${S.border}`,
              borderRadius: 5, padding: '2px 7px', lineHeight: 1.6,
            }}>{k}</kbd>
          ))}
          <span style={{ fontSize: 11, color: S.border }}> · {t.hint}</span>
        </div>
      </motion.div>
    </div>
  )
}
