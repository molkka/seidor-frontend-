import { Outlet } from '@tanstack/react-router'
import { AppTopbar } from '@/components/layout/app-topbar'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div style={{ minHeight: '100svh', background: '#F5F6F8' }}>
      <AppTopbar />
      <main style={{ paddingTop: 64 }}>
        <div style={{ padding: '2rem 2.5rem', maxWidth: 1600, margin: '0 auto' }}>
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  )
}
