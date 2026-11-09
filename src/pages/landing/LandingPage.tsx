// src/pages/landing/LandingPage.tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { api } from '@/services/api'
import { LanguageChoice } from '@/features/auth/consultant-registration'
import { useT } from '@/hooks/useT'
import { authApi } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AuthDivider,
  AuthField,
  AuthInput,
  AuthMessage,
  AuthPasswordInput,
  GoogleSignInButton,
  Reveal,
  authLinkClass,
} from '@/components/auth/auth-controls'
import { BrandPanel, type PlatformStats } from './components/brand-panel'

type Mode = 'signin' | 'signup'

const COPY: Record<Mode, { title: string; subtitle: string }> = {
  signin: {
    title: 'Welcome back',
    subtitle: 'Sign in to your SAP Planning workspace',
  },
  signup: {
    title: 'Create account',
    subtitle: 'Join your SAP Planning workspace',
  },
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const security = useT().security
  const signupInFlight = useRef(false)
  const { setAuth } = useAuthStore()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<PlatformStats | null>(null)

  const isSignup = mode === 'signup'

  useEffect(() => {
    if (!useAuthStore.getState().token) return
    api
      .get('/dashboard/kpi')
      .then((r) => setStats(r.data))
      .catch(() => {})
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      setAuth(res.data.access_token, res.data.user)
      navigate({ to: '/dashboard' })
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status
      setError(status === 403 ? security.verificationRequired : status === 429 ? security.limited : security.failure)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (signupInFlight.current) return
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) { setError(security.passwordRule); return }
    if (password !== confirmPw) {
      setError(security.mismatch)
      return
    }
    setError('')
    signupInFlight.current = true
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        nom: name,
        email,
        password,
      })
      void res
      setSuccess(security.sent)
      setPassword(''); setConfirmPw('')
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        .response?.data?.detail
      const status = (err as { response?: { status?: number } }).response?.status
      setError(status === 503 ? security.smtp : status === 429 ? security.limited : typeof detail === 'string' ? detail : security.failure)
    } finally {
      signupInFlight.current = false
      setLoading(false)
    }
  }

  async function handleGoogleLogin(credentialResponse: {
    credential?: string
  }) {
    if (!credentialResponse.credential) return
    setError('')
    setLoading(true)
    try {
      const res = await authApi.googleLogin(credentialResponse.credential)
      setAuth(res.data.access_token, res.data.user)
      navigate({ to: '/dashboard' })
    } catch {
      setError('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MotionConfig reducedMotion='user'>
      {/* `light` pins the light palette: the logo is designed for white */}
      <div className='light grid min-h-svh bg-white text-foreground scheme-light lg:grid-cols-2 xl:grid-cols-5'>
        {/* ── Authentication panel ─────────────────────────────── */}
        {/* Below lg the logo and form are centred as one block; from lg the
            logo pins to the top and the footer to the bottom, on the same
            lines as the brand panel's badge and stats. */}
        <div className='flex min-h-svh flex-col px-6 sm:px-10 xl:col-span-2'>
          <div className='mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pt-10 xl:pt-12'>
            <header className='flex h-10 items-center'>
              <img
                src='/images/seidor-logo.png'
                alt='SEIDOR'
                className='h-10 w-auto'
              />
            </header>

            <motion.main
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className='pt-10 pb-12 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:pt-12'
            >
              <AnimatePresence mode='wait' initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
                    {isSignup ? security.registerTitle : COPY[mode].title}
                  </h1>
                  <p className='mt-2 text-base text-muted-foreground'>
                    {isSignup ? security.registerHelp : COPY[mode].subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>

              {isSignup && <LanguageChoice />}
              <form
                onSubmit={isSignup ? handleSignup : handleSubmit}
                className='mt-8 flex flex-col'
              >
                <AnimatePresence initial={false}>
                  {isSignup && (
                    <Reveal key='name'>
                      <div className='pb-5'>
                        <AuthField id='auth-name' label={security.name}>
                          <AuthInput
                            id='auth-name'
                            type='text'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder='Your full name'
                            required
                            autoComplete='name'
                          />
                        </AuthField>
                      </div>
                    </Reveal>
                  )}
                </AnimatePresence>

                <AuthField id='auth-email' label={security.email}>
                  <AuthInput
                    id='auth-email'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='you@seidor.com'
                    required
                    autoComplete='email'
                  />
                </AuthField>

                <div className='mt-5'>
                  <AuthField
                    id='auth-password'
                    label={security.password}
                    action={
                      !isSignup && (
                        <Link to='/forgot-password' className={authLinkClass}>
                          Forgot password?
                        </Link>
                      )
                    }
                  >
                    <AuthPasswordInput
                      id='auth-password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder='Enter your password'
                      required
                      autoComplete={
                        isSignup ? 'new-password' : 'current-password'
                      }
                    />
                  </AuthField>
                </div>

                <AnimatePresence initial={false}>
                  {isSignup && (
                    <Reveal key='confirm'>
                      <div className='pt-5'>
                        <AuthField
                          id='auth-confirm-password'
                          label={security.confirm}
                        >
                          <AuthPasswordInput
                            id='auth-confirm-password'
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            placeholder='Repeat your password'
                            required
                            autoComplete='new-password'
                          />
                        </AuthField>
                      </div>
                    </Reveal>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {error && (
                    <Reveal key='error'>
                      <div className='pt-5'>
                        <AuthMessage tone='error'>{error}</AuthMessage>
                      </div>
                    </Reveal>
                  )}
                  {success && (
                    <Reveal key='success'>
                      <div className='pt-5'>
                        <AuthMessage tone='success'>{success}</AuthMessage>
                      </div>
                    </Reveal>
                  )}
                </AnimatePresence>

                <Button
                  type='submit'
                  disabled={loading}
                  className='mt-6 h-10 w-full font-semibold'
                >
                  {loading && <LoaderCircle className='animate-spin' />}
                  {loading
                    ? isSignup
                      ? 'Creating account…'
                      : 'Signing in…'
                    : isSignup
                      ? security.register
                      : 'Sign in'}
                </Button>
              </form>

              <div className='my-6'>
                <AuthDivider>or</AuthDivider>
              </div>

              <GoogleSignInButton
                onSuccess={handleGoogleLogin}
                onError={() => setError('Google sign-in failed.')}
              />

              <p className='mt-8 text-center text-sm text-muted-foreground'>
                {isSignup
                  ? 'Already have an account?'
                  : "Don't have an account?"}{' '}
                <button
                  type='button'
                  className={authLinkClass}
                  onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
                >
                  {isSignup ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </motion.main>
          </div>

          <footer className='mx-auto w-full max-w-sm pb-10 text-xs text-muted-foreground xl:pb-12'>
            © {new Date().getFullYear()} SEIDOR · Humanizing Technology
          </footer>
        </div>

        {/* ── Branding panel (lg+) ─────────────────────────────── */}
        <BrandPanel stats={stats} className='xl:col-span-3' />
      </div>
    </MotionConfig>
  )
}
