// src/pages/auth/LoginPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '@/store/authStore'
import { usePlanningYearStore } from '@/store/planningYearStore'
import { api, describeApiError } from '@/services/api'
import { authApi } from '@/services/authApi'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  function afterLogin() {
    const { selectedYear } = usePlanningYearStore.getState()
    navigate({ to: selectedYear ? '/dashboard' : '/year-selection' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      setAuth(res.data.access_token, res.data.user)
      afterLogin()
    } catch (err) {
      // Ne plus afficher "mot de passe incorrect" pour *toute* erreur : une API
      // arrêtée ou une base injoignable donnait le même message et faisait
      // croire à un identifiant erroné.
      setError(describeApiError(err, 'Email ou mot de passe incorrect.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return
    setError('')
    try {
      const res = await authApi.googleLogin(credentialResponse.credential)
      setAuth(res.data.access_token, res.data.user)
      afterLogin()
    } catch (err) {
      setError(describeApiError(err, 'Connexion Google échouée. Veuillez réessayer.'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Planning SAP Africa</h1>
          <p className="text-sm text-muted-foreground mt-2">Connectez-vous à votre espace</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@seidor.com"
                required
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">
                  Mot de passe
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Séparateur */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Bouton Google */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Connexion Google échouée.')}
              text="signin_with"
              locale="fr"
              width="100%"
            />
          </div>
        </div>

        {/* Comptes de test */}
        <div className="mt-4 bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1 text-foreground">Comptes de test :</p>
          <p>manager@seidor.com / Manager123!</p>
          <p>admin@seidor.com / Admin123!</p>
        </div>
      </div>
    </div>
  )
}
