import { api } from './api'

interface TokenResponse {
  access_token: string
  token_type: string
  user: { id: number; nom: string; email: string; role: string }
}

export const authApi = {
  forgotPassword: (email: string) =>
    api.post<{ message: string; mail_configured: boolean }>('/auth/forgot-password', { email }),

  verifyResetToken: (token: string) =>
    api.post<{ valid: boolean; email?: string }>('/auth/verify-reset-token', { token }),

  resetPassword: (token: string, new_password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, new_password }),

  googleLogin: (id_token: string) =>
    api.post<TokenResponse>('/auth/google', { id_token }),
}
