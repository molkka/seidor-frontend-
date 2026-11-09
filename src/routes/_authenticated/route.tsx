import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore, type User } from '@/store/authStore'
import { api } from '@/services/api'
import { usePlanningYearStore } from '@/store/planningYearStore'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { token } = useAuthStore.getState()
    if (!token) throw redirect({ to: '/' })
    let user: User
    try {
      user = (await api.get<User>('/auth/me')).data
      useAuthStore.getState().setAuth(token, user)
    } catch {
      useAuthStore.getState().clearSession()
      throw redirect({ to: '/' })
    }
    const adminOnly = ['/settings/users', '/users', '/analytics', '/chatbot']
    if (adminOnly.some(path => location.pathname.startsWith(path)) && !user.permissions?.includes('admin:access')) {
      throw redirect({ to: '/dashboard' })
    }

    const { selectedYear } = usePlanningYearStore.getState()
    const isYearPage = location.pathname.startsWith('/year-selection')
    if (!selectedYear && !isYearPage) {
      throw redirect({ to: '/year-selection' })
    }
  },
  component: AuthenticatedLayout,
})
