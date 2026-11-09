// src/components/superset-dashboard.tsx
import { useEffect, useRef, useState } from 'react'
import { embedDashboard, type EmbeddedDashboard } from '@superset-ui/embedded-sdk'
import { BarChart3 } from 'lucide-react'
import { getSupersetGuestToken } from '@/services/supersetApi'
import { cn } from '@/lib/utils'

interface SupersetDashboardProps {
  className?: string
}

/**
 * Monte le dashboard Superset embarqué (Embedded SDK, flux guest-token).
 * Extrait d'AnalyticsPage pour être réutilisable depuis le Dashboard.
 */
export function SupersetDashboard({ className }: SupersetDashboardProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let embedded: EmbeddedDashboard | null = null

    async function embed() {
      try {
        const { dashboardId, supersetUrl } = await getSupersetGuestToken()
        if (cancelled || !mountRef.current) return

        embedded = await embedDashboard({
          id: dashboardId,
          supersetDomain: supersetUrl,
          mountPoint: mountRef.current,
          fetchGuestToken: async () => (await getSupersetGuestToken()).token,
          dashboardUiConfig: { hideTitle: true, filters: { expanded: false } },
        })
      } catch {
        if (!cancelled) setError("Impossible de charger le tableau de bord analytique. Vérifiez que Superset est démarré.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    embed()
    return () => {
      cancelled = true
      embedded?.unmount()
    }
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center gap-2 h-64 text-sm text-muted-foreground animate-pulse">
          <BarChart3 size={16} />
          Chargement du tableau de bord…
        </div>
      )}

      <div
        ref={mountRef}
        className="w-full rounded-xl border border-border overflow-hidden [&_iframe]:w-full [&_iframe]:min-h-[85vh] [&_iframe]:border-0"
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  )
}
