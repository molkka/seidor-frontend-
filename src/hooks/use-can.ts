import { useAuthStore } from '@/store/authStore'

export function useCan(permission: string) {
  return useAuthStore(state => Boolean(state.user?.permissions?.includes(permission)))
}

