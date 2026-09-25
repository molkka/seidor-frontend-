import { api } from '@/services/api'

export interface SupersetGuestTokenResponse {
  token: string
  dashboardId: string
  supersetUrl: string
}

export async function getSupersetGuestToken(): Promise<SupersetGuestTokenResponse> {
  const { data } = await api.get<SupersetGuestTokenResponse>('/superset/guest-token')
  return data
}
