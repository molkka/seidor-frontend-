import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/store/authStore'
import { usePlanningYearStore } from '@/store/planningYearStore'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const { token } = useAuthStore.getState()
    if (!token) throw redirect({ to: '/' })

    const { selectedYear } = usePlanningYearStore.getState()
    const isYearPage = location.pathname.startsWith('/year-selection')
    if (!selectedYear && !isYearPage) {
      throw redirect({ to: '/year-selection' })
    }
  },
  component: AuthenticatedLayout,
})
