// src/pages/analytics/AnalyticsPage.tsx
import { SupersetDashboard } from '@/components/superset-dashboard'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 rounded-full bg-primary" />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Analytics</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              KPIs planning, utilisation &amp; portefeuille projets — Apache Superset
            </p>
          </div>
        </div>
      </div>

      <SupersetDashboard />
    </div>
  )
}
