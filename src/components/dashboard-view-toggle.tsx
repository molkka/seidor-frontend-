// src/components/dashboard-view-toggle.tsx
import { BarChart3, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DashboardView = 'general' | 'analytics'

interface DashboardViewToggleProps {
  value: DashboardView
  onChange: (view: DashboardView) => void
  className?: string
}

const OPTIONS = [
  { value: 'general' as const, label: 'Général', icon: LayoutDashboard },
  { value: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
]

/**
 * Bouton glissant (segmented control) : bascule entre le dashboard
 * général (template) et le dashboard Superset, sans changer de page.
 */
export function DashboardViewToggle({ value, onChange, className }: DashboardViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Choisir la vue du tableau de bord"
      className={cn(
        'relative inline-grid grid-cols-2 rounded-full border border-border bg-muted/40 p-1',
        className
      )}
    >
      {/* Pastille glissante */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: value === 'general' ? 'translateX(0)' : 'translateX(100%)' }}
      />

      {OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5',
              'text-xs font-semibold whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={13} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
