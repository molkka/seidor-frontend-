import { useCan } from '@/hooks/use-can'
import { useT } from '@/hooks/useT'
import { Outlet } from '@tanstack/react-router'
import { AppTopbar } from '@/components/layout/app-topbar'
import { PlanningAssistant } from '@/components/planning-assistant'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const admin = useCan("admin:access")
  const t = useT().security
  return (
    <div style={{ minHeight: '100svh', background: '#F5F6F8' }}>
      <AppTopbar />
      <main style={{ paddingTop: 64 }}>
        <div style={{ padding: '2rem 2.5rem', maxWidth: 1600, margin: '0 auto' }}>
          {!admin && <p className="mb-4 rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground" role="status">{t.readOnly}</p>}
          {children ?? <Outlet />}
        </div>
      </main>
      {admin && <PlanningAssistant />}
    </div>
  )
}
