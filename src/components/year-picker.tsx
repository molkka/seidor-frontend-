import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface YearPickerProps {
  value: number
  onChange: (year: number) => void
  minYear?: number
  maxYear?: number
  className?: string
}

const NAVY = '#162B6E'

export function YearPicker({
  value,
  onChange,
  minYear = 2025,
  maxYear = 2100,
  className,
}: YearPickerProps) {
  const [open, setOpen] = useState(false)
  const [decadeStart, setDecadeStart] = useState(() => Math.floor(value / 10) * 10)

  useEffect(() => {
    setDecadeStart(Math.floor(value / 10) * 10)
  }, [value])

  const years = Array.from({ length: 12 }, (_, i) => decadeStart + i)
  const canGoPrev = decadeStart - 10 >= Math.floor(minYear / 10) * 10
  const canGoNext = decadeStart + 10 <= Math.floor(maxYear / 10) * 10

  function handleSelect(year: number) {
    if (year < minYear || year > maxYear) return
    onChange(year)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('h-9 gap-2 px-3 text-sm font-semibold', className)}
          style={{ color: NAVY, borderColor: `${NAVY}40` }}
        >
          <CalendarDays className="h-4 w-4" style={{ color: NAVY }} />
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setDecadeStart(d => d - 10)}
            disabled={!canGoPrev}
            className="rounded p-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Décennie précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
            {decadeStart} – {decadeStart + 11}
          </span>
          <button
            type="button"
            onClick={() => setDecadeStart(d => d + 10)}
            disabled={!canGoNext}
            className="rounded p-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Décennie suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {years.map(year => {
            const isSelected = year === value
            const isDisabled = year < minYear || year > maxYear
            return (
              <button
                key={year}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(year)}
                className={cn(
                  'rounded-md py-1.5 text-xs font-semibold transition-colors',
                  isDisabled && 'text-muted-foreground/40 cursor-not-allowed',
                  !isDisabled && !isSelected && 'hover:bg-muted cursor-pointer',
                )}
                style={isSelected ? { background: NAVY, color: '#fff' } : undefined}
              >
                {year}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
