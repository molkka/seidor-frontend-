import { api } from './api'

interface TokenResponse {
  access_token: string
  token_type: string
  user: { id: number; nom: string; email: string; role: string }
}

export const authApi = {
  register: (nom: string, email: string, password: string) => api.post<{ message: string }>('/auth/register', { nom, email, password }),
  verificationStatus: (token: string) => api.post<{ valid: boolean }>('/auth/verification-status', { token }),
  verifyEmail: (token: string, password: string) => api.post<{ message: string }>('/auth/verify-email', { token, password }),
  // 200 = request accepted (same answer whether or not the account exists),
  // 422 = invalid email, 429 = rate limited, 503 = email service unavailable.
  forgotPassword: (email: string, signal?: AbortSignal) =>
    api.post<{ message: string }>(
      '/auth/forgot-password',
      { email },
      { signal }
    ),

  verifyResetToken: (token: string, signal?: AbortSignal) =>
    api.post<{ valid: boolean; email?: string }>(
      '/auth/verify-reset-token',
      { token },
      { signal }
    ),

  // 400 = link invalid/expired/used, 422 = password rules
  resetPassword: (token: string, new_password: string, signal?: AbortSignal) =>
    api.post<{ message: string }>(
      '/auth/reset-password',
      { token, new_password },
      { signal }
    ),

  googleLogin: (id_token: string) =>
    api.post<TokenResponse>('/auth/google', { id_token }),
}
