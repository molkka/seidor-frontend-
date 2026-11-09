import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/authStore'
import { usePlanningYearStore } from '@/store/planningYearStore'
import { MotionConfig, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  LoaderCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/useT'
import { Button } from '@/components/ui/button'
import { isoWeeksInYear, weekdaysInYear } from './year-calendar'
import { YearPicker } from './year-picker'

const MIN_YEAR = 2025
const MAX_YEAR = 2100
const FEATURE_ICONS = [CalendarRange, Users, FolderKanban]

const clampYear = (y: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, y))

export default function YearSelectionPage() {
  const navigate = useNavigate()
  const t = useT().yearSelection
  const nom = useAuthStore((s) => s.user?.nom) ?? ''
  const { selectedYear: activeYear, setSelectedYear } = usePlanningYearStore()

  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(() => clampYear(activeYear ?? thisYear))
  const [direction, setDirection] = useState(0)
  const [confirming, setConfirming] = useState(false)

  const quickYears = Array.from({ length: 6 }, (_, i) => thisYear + i).filter(
    (y) => y >= MIN_YEAR && y <= MAX_YEAR
  )
  const greeting = nom
    ? `${t.greeting} ${nom}`
    : t.greeting.replace(/,\s*$/, '')

  function selectYear(next: number) {
    if (next === year) return
    setDirection(next > year ? 1 : -1)
    setYear(next)
  }

  function confirm() {
    if (confirming) return
    setConfirming(true)
    setSelectedYear(year)
    navigate({ to: '/dashboard' }).catch(() => setConfirming(false))
  }

  return (
    <MotionConfig reducedMotion='user'>
      {/* Full-screen above the app top bar (z-50); `light` pins the palette */}
      <div className='light fixed inset-0 z-60 flex flex-col overflow-y-auto bg-background text-foreground scheme-light lg:flex-row lg:overflow-hidden'>
        {/* ── Brand panel ───────────────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className='flex shrink-0 flex-col surface-brand px-6 py-8 text-white sm:px-10 lg:w-88 lg:py-10 xl:w-104 xl:px-12 xl:py-12 2xl:w-120'
        >
          <div className='flex h-10 items-center gap-3'>
            <span className='flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 ring-inset'>
              <CalendarDays className='size-4' aria-hidden />
            </span>
            <div className='leading-tight'>
              <p className='text-sm font-semibold'>SAP Africa Planning</p>
              <p className='text-xs tracking-wide text-white/60'>SEIDOR</p>
            </div>
          </div>

          <div className='mt-8 lg:my-auto lg:py-10'>
            <h2 className='max-w-xs text-2xl leading-tight font-semibold tracking-tight text-balance xl:text-3xl'>
              {greeting}
            </h2>
            <p className='mt-2 text-sm text-balance text-white/75 xl:text-base'>
              {t.tagline}
            </p>
            <p className='mt-6 hidden max-w-sm text-sm leading-relaxed text-white/65 md:block'>
              {t.description}
            </p>
            <ul className='mt-8 hidden space-y-3 lg:block'>
              {t.features.map((feature, i) => {
                const Icon = FEATURE_ICONS[i] ?? CalendarRange
                return (
                  <li
                    key={feature}
                    className='flex items-center gap-3 text-sm font-medium text-white/85'
                  >
                    <span className='flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 ring-inset'>
                      <Icon className='size-4' aria-hidden />
                    </span>
                    {feature}
                  </li>
                )
              })}
            </ul>
          </div>

          <footer className='hidden border-t border-white/10 pt-6 text-xs text-white/50 lg:block'>
            © {thisYear} SEIDOR · SAP Africa Planning
          </footer>
        </motion.aside>

        {/* ── Year selection ────────────────────────────────────── */}
        <main className='flex flex-1 justify-center px-6 py-10 sm:px-10 lg:overflow-y-auto lg:py-12'>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className='my-auto w-full max-w-lg'
          >
            <p className='text-xs font-semibold tracking-widest text-primary uppercase'>
              {t.step}
            </p>
            <h1 className='mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl'>
              {t.title}
            </h1>
            <p className='mt-2 text-sm text-muted-foreground sm:text-base'>
              {t.subtitle}
            </p>

            <section
              aria-label={t.pickerLabel}
              className='mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8'
            >
              <YearPicker
                value={year}
                min={MIN_YEAR}
                max={MAX_YEAR}
                direction={direction}
                onChange={selectYear}
                onConfirm={confirm}
                autoFocus
                labels={{
                  picker: t.pickerLabel,
                  previous: t.previousYear,
                  next: t.nextYear,
                }}
              />

              {/* Reserved height: no layout shift when the badge toggles */}
              <div className='mt-1 flex h-6 justify-center'>
                {year === activeYear && (
                  <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700'>
                    <span
                      aria-hidden
                      className='size-1.5 rounded-full bg-emerald-500'
                    />
                    {t.active}
                  </span>
                )}
              </div>

              <dl className='mt-4 grid grid-cols-2 divide-x divide-border rounded-xl border border-border'>
                <Metric label={t.weeksLabel} value={isoWeeksInYear(year)} />
                <Metric label={t.workDaysLabel} value={weekdaysInYear(year)} />
              </dl>
              <p className='mt-2 text-xs text-muted-foreground'>
                {t.calendarNote}
              </p>

              <Button
                type='button'
                onClick={confirm}
                disabled={confirming}
                className='mt-6 h-10 w-full font-semibold'
              >
                {confirming ? (
                  <>
                    <LoaderCircle className='animate-spin' />
                    {t.loading}
                  </>
                ) : (
                  <>
                    {t.launch} {year}
                    <ArrowRight />
                  </>
                )}
              </Button>
            </section>

            {quickYears.length > 0 && (
              <section className='mt-8'>
                <h2 className='text-xs font-semibold tracking-widest text-muted-foreground uppercase'>
                  {t.quickAccess}
                </h2>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {quickYears.map((y) => (
                    <button
                      key={y}
                      type='button'
                      aria-pressed={y === year}
                      onClick={() => selectYear(y)}
                      className={cn(
                        'h-8 rounded-md border px-3 text-sm tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/25',
                        y === year
                          ? 'border-primary/30 bg-secondary font-semibold text-primary'
                          : 'border-border bg-white text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <p className='mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground'>
              <span className='inline-flex items-center gap-1.5'>
                <Kbd>←</Kbd>
                <Kbd>→</Kbd>
                {t.hintChange}
              </span>
              <span className='inline-flex items-center gap-1.5'>
                <Kbd>{t.enterKey}</Kbd>
                {t.hintConfirm}
              </span>
            </p>
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className='px-4 py-3'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-0.5 text-xl font-semibold tracking-tight tabular-nums'>
        {value}
      </dd>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className='inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-white px-1 font-sans text-xs font-medium text-foreground'>
      {children}
    </kbd>
  )
}
