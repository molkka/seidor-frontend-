import { useEffect, useRef, useState } from 'react'
import { useT } from '@/hooks/useT'
import { useI18nStore } from '@/store/i18nStore'
import { authApi } from '@/services/authApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

function failure(error: unknown, copy: ReturnType<typeof useT>['security']) {
  const status = (error as { response?: { status?: number } }).response?.status
  return status === 503 ? copy.smtp : status === 429 ? copy.limited : copy.failure
}

export function LanguageChoice() {
  const { lang, setLang } = useI18nStore()
  return <div className="mb-4 flex gap-2" aria-label="Language">
    {(['fr', 'en', 'ar'] as const).map(value => <button key={value} type="button" aria-pressed={lang === value}
      className="rounded border px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-primary"
      onClick={() => setLang(value)}>{value === 'ar' ? 'العربية' : value.toUpperCase()}</button>)}
  </div>
}

export function ConsultantRegistration() {
  const t = useT().security
  const lang = useI18nStore(state => state.lang)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    if (password !== confirm) { setError(t.mismatch); return }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) { setError(t.passwordRule); return }
    inFlight.current = true; setBusy(true); setError('')
    try {
      await authApi.register(name.trim(), email.trim(), password)
      setSent(true); setPassword(''); setConfirm('')
    } catch (error) { setError(failure(error, t)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <section dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <LanguageChoice />
    <h1 className="text-xl font-semibold">{t.registerTitle}</h1>
    <p className="mt-2 mb-5 text-sm text-muted-foreground">{t.registerHelp}</p>
    {sent ? <p role="status" className="rounded-lg border bg-muted p-4 text-sm">{t.sent}</p> :
      <form className="grid gap-4" onSubmit={submit} aria-busy={busy}>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <label className="grid gap-2 text-sm">{t.name}<Input autoComplete="name" required maxLength={200} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
        <label className="grid gap-2 text-sm">{t.email}<Input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} /></label>
        <label className="grid gap-2 text-sm">{t.password}<PasswordInput autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
        <label className="grid gap-2 text-sm">{t.confirm}<PasswordInput autoComplete="new-password" required value={confirm} onChange={event => setConfirm(event.target.value)} disabled={busy} /></label>
        <Button type="submit" disabled={busy}>{busy ? '…' : t.register}</Button>
      </form>}
  </section>
}

export function EmailVerification() {
  const t = useT().security
  const lang = useI18nStore(state => state.lang)
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '')
  const [valid, setValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname)
    let active = true
    if (!token) { setValid(false); return }
    authApi.verificationStatus(token).then(response => { if (active) setValid(response.data.valid) })
      .catch(error => { if (active) setError(failure(error, t)) })
    return () => { active = false }
  }, [token, t])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) { setError(t.passwordRule); return }
    inFlight.current = true; setBusy(true); setError('')
    try { await authApi.verifyEmail(token, password); setDone(true); setPassword('') }
    catch (error) { setError(failure(error, t)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <section className="mx-auto my-12 w-full max-w-md rounded-xl border bg-card p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <LanguageChoice />
    <h1 className="text-xl font-semibold">{t.verifyTitle}</h1>
    <p className="my-4 text-sm text-muted-foreground">{done ? t.verified : valid === false ? t.invalid : t.verifyHelp}</p>
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    {valid && !done && <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
      <label className="grid gap-2 text-sm">{t.password}<PasswordInput required autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
      <Button disabled={busy} type="submit">{busy ? '…' : t.verify}</Button>
    </form>}
    <a className="mt-5 inline-block text-sm font-medium text-primary underline" href="/">{t.signIn}</a>
  </section>
}
