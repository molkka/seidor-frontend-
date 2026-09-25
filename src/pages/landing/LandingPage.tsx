// src/pages/auth/LandingPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'
import { authApi } from '@/services/authApi'

// ─── Globe Canvas ─────────────────────────────────────────────────────────────
function GlobeOverlay() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const SIZE = Math.round(Math.min(window.innerHeight * 0.30, window.innerWidth * 0.22))
    canvas.width  = SIZE
    canvas.height = SIZE
    const cx = SIZE / 2
    const cy = SIZE / 2
    const R  = SIZE * 0.46
    let rot = 0
    let raf = 0

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()

      for (let lat = -70; lat <= 70; lat += 22) {
        const la = lat * Math.PI / 180
        const ry = cy + R * Math.sin(la)
        const rx = R  * Math.cos(la)
        ctx.beginPath()
        ctx.ellipse(cx, ry, rx, rx * 0.10, 0, 0, Math.PI * 2)
        ctx.strokeStyle = lat === 0 ? 'rgba(80,210,255,0.75)' : 'rgba(60,190,255,0.35)'
        ctx.lineWidth   = lat === 0 ? 1.4 : 0.9
        ctx.stroke()
      }

      for (let lng = 0; lng < 180; lng += 18) {
        const app  = ((lng + rot) % 360 + 360) % 360
        const sinA = Math.sin(app * Math.PI / 180)
        const front = app < 180
        ctx.beginPath()
        ctx.ellipse(cx, cy, Math.abs(sinA) * R, R, 0, 0, Math.PI * 2)
        ctx.strokeStyle = front ? 'rgba(60,200,255,0.55)' : 'rgba(30,160,230,0.12)'
        ctx.lineWidth   = front ? 1.1 : 0.5
        ctx.stroke()
      }

      for (let lat = -55; lat <= 55; lat += 22) {
        for (let lon = 0; lon < 360; lon += 36) {
          const la = lat * Math.PI / 180
          const lo = (lon + rot) * Math.PI / 180
          const x3 =  Math.cos(la) * Math.sin(lo)
          const y3 = -Math.sin(la)
          const z3 =  Math.cos(la) * Math.cos(lo)
          if (z3 < 0.05) continue
          const px = cx + R * x3
          const py = cy + R * y3
          const a  = Math.min(z3 * 1.6, 1)
          const halo = ctx.createRadialGradient(px, py, 0, px, py, 9)
          halo.addColorStop(0, `rgba(100,230,255,${a * 0.65})`)
          halo.addColorStop(1, 'rgba(0,170,255,0)')
          ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2)
          ctx.fillStyle = halo; ctx.fill()
          ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(180,240,255,${a})`; ctx.fill()
        }
      }
      ctx.restore()

      const atm = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.35)
      atm.addColorStop(0,   'rgba(0,190,255,0.30)')
      atm.addColorStop(0.5, 'rgba(0,130,230,0.10)')
      atm.addColorStop(1,   'rgba(0,80,200,0)')
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2)
      ctx.fillStyle = atm; ctx.fill()

      rot += 0.28
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  const SIZE = Math.round(Math.min(
    window.innerHeight * 0.30,
    window.innerWidth  * 0.22,
  ))

  return (
    <canvas
      ref={ref}
      style={{
        position:      'absolute',
        left:          '80%',
        top:           '36%',
        transform:     'translate(-50%, -50%)',
        width:          SIZE,
        height:         SIZE,
        zIndex:         4,
        pointerEvents: 'none',
        mixBlendMode:  'screen',
        filter:        'drop-shadow(0 0 24px rgba(0,180,255,0.6))',
      }}
    />
  )
}

// ─── Eye Icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatsData {
  total_consultants: number
  total_projets: number
  consultants_actifs: number
  projets_in_progress: number
  version_actuelle: string
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()

  const [mode,          setMode]          = useState<'signin' | 'signup'>('signin')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [name,          setName]          = useState('')
  const [confirmPw,     setConfirmPw]     = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')
  const [loading,       setLoading]       = useState(false)
  const [stats,         setStats]         = useState<StatsData | null>(null)

  useEffect(() => {
    const id = 'gf-inter'
    if (document.getElementById(id)) return
    const l = document.createElement('link')
    l.id = id; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    document.head.appendChild(l)
  }, [])

  useEffect(() => {
    api.get('/dashboard/kpi').then(r => setStats(r.data)).catch(() => {})
  }, [])

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      setAuth(res.data.access_token, res.data.user)
      navigate({ to: '/dashboard' })
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPw) { setError('Passwords do not match.'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/register', { nom: name, email, password })
      if (res.data.access_token) {
        setAuth(res.data.access_token, res.data.user)
        navigate({ to: '/dashboard' })
      } else {
        setSuccess('Account created! You can now sign in.')
        setMode('signin')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return
    setError(''); setLoading(true)
    try {
      const res = await authApi.googleLogin(credentialResponse.credential)
      setAuth(res.data.access_token, res.data.user)
      navigate({ to: '/dashboard' })
    } catch {
      setError('Connexion Google échouée. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", width: '100vw', height: '100svh', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
        .field {
          width:100%; padding:11px 15px;
          background:rgba(255,255,255,.1);
          border:1px solid rgba(255,255,255,.22);
          border-radius:9px; color:#fff;
          font-size:14px; font-family:'Inter',sans-serif;
          outline:none;
          transition:border-color .2s, background .2s, box-shadow .2s;
        }
        .field::placeholder { color:rgba(255,255,255,.35) }
        .field:focus {
          border-color:rgba(96,165,250,.75);
          background:rgba(255,255,255,.15);
          box-shadow:0 0 0 3px rgba(96,165,250,.2);
        }
        .cta {
          width:100%; padding:12px;
          background:linear-gradient(135deg,#2563eb,#1d4ed8);
          border:none; border-radius:9px;
          color:#fff; font-size:15px; font-weight:600;
          font-family:'Inter',sans-serif; cursor:pointer;
          letter-spacing:.02em;
          transition:transform .18s, box-shadow .18s, opacity .18s;
          box-shadow:0 4px 18px rgba(37,99,235,.5);
        }
        .cta:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(37,99,235,.65) }
        .cta:active:not(:disabled) { transform:translateY(0px) }
        .cta:disabled { opacity:.55; cursor:not-allowed }
        .ghost {
          background:none; border:none; cursor:pointer; padding:0;
          color:rgba(255,255,255,.4); display:flex; align-items:center;
          transition:color .2s;
        }
        .ghost:hover { color:rgba(255,255,255,.8) }
        .lnk {
          background:none; border:none; cursor:pointer; padding:0;
          color:rgba(147,197,253,.9); font-family:'Inter',sans-serif;
          font-size:13px; font-weight:500; transition:color .2s;
        }
        .lnk:hover { color:#fff }
        .spin-ico {
          display:inline-block; width:13px; height:13px;
          border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
          border-radius:50%; animation:spin .7s linear infinite;
          vertical-align:middle; margin-right:8px;
        }
        .divider { height:1px; background:rgba(255,255,255,.15); border:none; margin:18px 0 }
      `}</style>

      {/* ── Background ────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/Gemini_Generated_Image_183wux183wux183w.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 38%',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 52%, rgba(3,10,28,.5) 100%)',
        }} />
      </div>

      {/* ── Globe ────────────────────────────────────────────── */}
      <GlobeOverlay />

      {/* ── Content ──────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', height: '100%',
        alignItems: 'center',
        padding: '0 5vw',
      }}>

        {/* ── Auth Card ──────────────────────────────────────── */}
        <motion.div
          layout
          initial={{ opacity: 0, x: -60, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
          style={{
            width: 'min(420px, 90vw)',
            background: 'rgba(5,18,50,.62)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,.14)',
            borderRadius: 20,
            padding: '2.6rem 2.4rem',
            boxShadow: '0 32px 80px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)',
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ marginBottom: '2rem' }}
          >
            <img
              src="/images/seidorCapture.PNG"
              alt="SEIDOR"
              style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </motion.div>

          {/* Title — changes with mode */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, marginBottom: 7, letterSpacing: '-.02em' }}>
                  {mode === 'signin' ? 'Welcome back' : 'Create account'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,.48)', fontSize: 14, marginBottom: '1.8rem', lineHeight: 1.5 }}>
                  {mode === 'signin' ? 'Sign in to your SAP Planning workspace' : 'Join your SAP Planning workspace'}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={mode === 'signin' ? handleSubmit : handleSignup}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {/* Full name — signup only */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.25 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <label style={{ color: 'rgba(255,255,255,.62)', fontSize: 13, fontWeight: 500 }}>
                    Full name
                  </label>
                  <input
                    className="field"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    required={mode === 'signup'}
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: 'rgba(255,255,255,.62)', fontSize: 13, fontWeight: 500 }}>
                Email address
              </label>
              <input
                className="field"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@seidor.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ color: 'rgba(255,255,255,.62)', fontSize: 13, fontWeight: 500 }}>Password</label>
                {mode === 'signin' && (
                  <button type="button" className="lnk" style={{ fontSize: 12 }} onClick={() => navigate({ to: '/forgot-password' })}>Forgot password?</button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="field"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Confirm password — signup only */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  key="confirm-field"
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <label style={{ color: 'rgba(255,255,255,.62)', fontSize: 13, fontWeight: 500 }}>
                    Confirm password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="field"
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="••••••••"
                      required={mode === 'signup'}
                      autoComplete="new-password"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setShowConfirmPw(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <EyeIcon open={showConfirmPw} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    background: 'rgba(239,68,68,.13)',
                    border: '1px solid rgba(239,68,68,.38)',
                    borderRadius: 9, padding: '10px 13px',
                    color: '#fca5a5', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                    overflow: 'hidden',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    background: 'rgba(16,185,129,.13)',
                    border: '1px solid rgba(16,185,129,.38)',
                    borderRadius: 9, padding: '10px 13px',
                    color: '#6ee7b7', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 8,
                    overflow: 'hidden',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              className="cta"
              disabled={loading}
              style={{ marginTop: 6 }}
              whileHover={loading ? {} : { scale: 1.02 }}
              whileTap={loading ? {} : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {loading
                ? <><span className="spin-ico" />{mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'signin' ? 'Sign In' : 'Create Account'
              }
            </motion.button>
          </motion.form>

          <hr className="divider" />

          {/* Google Sign-In */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:14 }}>
            <span style={{ color:'rgba(255,255,255,.28)', fontSize:11, textTransform:'uppercase', letterSpacing:'.08em' }}>
              ou continuer avec
            </span>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError('Connexion Google échouée.')}
              text="signin_with"
              locale="fr"
            />
          </div>

          {/* Mode toggle */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.35)', fontSize: 13 }}>
            {mode === 'signin'
              ? <>Don't have an account?{' '}<button type="button" className="lnk" style={{ fontWeight: 600 }} onClick={() => switchMode('signup')}>Sign up</button></>
              : <>Already have an account?{' '}<button type="button" className="lnk" style={{ fontWeight: 600 }} onClick={() => switchMode('signin')}>Sign in</button></>
            }
          </p>

          <p style={{ color: 'rgba(255,255,255,.18)', fontSize: 11, letterSpacing: '.05em', marginTop: '1.6rem' }}>
            © 2024 SEIDOR · Humanizing Technology
          </p>
        </motion.div>

        {/* ── Stats bar bottom-left ──────────────────────────── */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: '3.5rem', left: '5vw',
              display: 'flex', gap: 0,
              background: 'rgba(0,0,0,.28)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,.15)',
              borderRadius: 14, overflow: 'hidden',
            }}
          >
            {[
              { value: `+${stats.total_consultants}`,    label: 'Consultants' },
              { value: `+${stats.total_projets}`,        label: 'Projets' },
              { value: `+${stats.projets_in_progress}`,  label: 'En cours' },
              { value: stats.version_actuelle ?? 'V1.3', label: 'Version active' },
            ].map((s, i, arr) => (
              <div key={s.label} style={{
                padding: '14px 22px',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,.1)' : 'none',
                textAlign: 'center',
              }}>
                <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em' }}>
                  {s.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Tagline bottom-right ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute', bottom: '3.5rem', right: '5vw',
            textAlign: 'right', maxWidth: 380,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,.28)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: 100, padding: '5px 14px', marginBottom: 12,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />
            <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              SAP Africa Region
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{
              color: '#fff', fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 700, lineHeight: 1.2,
              letterSpacing: '-.02em', textShadow: '0 2px 16px rgba(0,0,0,.6)', marginBottom: 10,
            }}
          >
            Plan smarter.<br />Deliver faster.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, lineHeight: 1.6, textShadow: '0 1px 8px rgba(0,0,0,.5)' }}
          >
            Resource planning &amp; delivery insights<br />for your SAP Africa team.
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
