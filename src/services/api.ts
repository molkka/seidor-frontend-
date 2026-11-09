import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  // Sans timeout, une API figée (ex. base de données injoignable) laisse la
  // requête pendre jusqu'au timeout du navigateur (~2 min) : l'écran reste
  // bloqué sur "Connexion..." sans le moindre message.
  timeout: 20000,
})

/** Message lisible expliquant pourquoi un appel a échoué, côté réseau/serveur. */
export function describeApiError(err: unknown, fallback: string): string {
  const e = err as {
    code?: string
    response?: { status?: number; data?: { detail?: unknown } }
    request?: unknown
  }

  if (e?.code === 'ECONNABORTED') {
    return "Le serveur met trop de temps à répondre. Vérifiez que l'API et la base de données sont démarrées."
  }
  if (!e?.response) {
    return "Impossible de joindre le serveur. Vérifiez que l'API est démarrée sur le port 8000."
  }
  const status = e.response.status ?? 0
  if (status >= 500) {
    return `Erreur serveur (${status}). L'API est joignable mais en échec — consultez ses logs.`
  }
  const detail = e.response.data?.detail
  if (typeof detail === 'string') return detail || fallback
  if (detail && typeof detail === 'object' && 'code' in detail && detail.code === 'email_verification_required') {
    return 'Vérifiez votre adresse email avant de vous connecter.'
  }
  return fallback
}

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const hadSession = Boolean(useAuthStore.getState().token)
      useAuthStore.getState().clearSession()
      // Only redirect when the user was previously authenticated (expired session).
      // If they were never logged in, let the page's own .catch() handle it.
      if (hadSession) window.location.href = '/'
    }
    return Promise.reject(err)
  }
)
