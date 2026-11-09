import { useEffect, useRef, useState } from 'react'
import { Mail, Send, ShieldCheck } from 'lucide-react'
import { api, describeApiError } from '@/services/api'
import { PlanningModalShell } from './PlanningModalShell'

interface Config { configured: boolean; recipient: string | null; host: string; port: string; delivery_mode: string }
interface Preview {
  draft_id: string; recipient: string; factual_summary: string; ai_summary: string; ai_status: string
  attachment_name: string; delivery_mode: string
  facts: { total_hours: number; project_count: number; consultant_count: number; weekly_mismatch_assignments: number }
}

export function PlanningEmailDialog({ version, onClose }: {
  version: { id: number; nom: string; annee: number }; onClose: () => void
}) {
  const [config, setConfig] = useState<Config | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [useAI, setUseAI] = useState(true)
  const [busy, setBusy] = useState<'smtp' | 'preview' | 'send' | null>(null)
  const [smtpMessage, setSmtpMessage] = useState('')
  const [smtpOK, setSmtpOK] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    api.get('/planning/email/config').then(response => { if (active.current) setConfig(response.data) })
      .catch(err => { if (active.current) setError(describeApiError(err, 'Configuration email indisponible.')) })
    return () => { active.current = false }
  }, [])

  async function checkSMTP() {
    setBusy('smtp'); setError(''); setSmtpMessage('')
    try {
      const response = await api.post('/planning/email/check-smtp', {}, { timeout: 35000 })
      if (active.current) { setSmtpMessage(response.data.message); setSmtpOK(response.data.ok); setConfig(response.data) }
    } catch (err) { if (active.current) setError(describeApiError(err, 'Impossible de vérifier SMTP.')) }
    finally { if (active.current) setBusy(null) }
  }

  async function prepare() {
    setBusy('preview'); setError(''); setSuccess(''); setPreview(null)
    try {
      const response = await api.post('/planning/email/preview', {
        version_id: version.id, year: version.annee, ai_summary: useAI, language: 'fr',
      }, { timeout: 90000 })
      if (active.current) setPreview(response.data)
    } catch (err) { if (active.current) setError(describeApiError(err, 'Impossible de préparer le résumé annuel.')) }
    finally { if (active.current) setBusy(null) }
  }

  async function send() {
    if (!preview) return
    setBusy('send'); setError('')
    try {
      const response = await api.post(`/planning/email/drafts/${preview.draft_id}/send`, {}, { timeout: 60000 })
      if (active.current) setSuccess(response.data.delivery_mode === 'local_capture'
        ? 'Email accepté par Mailpit. Consultez http://localhost:8025 ; il n’a pas été livré à une boîte externe.'
        : `Email accepté par le serveur SMTP pour ${response.data.recipient}.`)
    } catch (err) { if (active.current) setError(describeApiError(err, 'Envoi non confirmé. Vérifiez SMTP avant de réessayer.')) }
    finally { if (active.current) setBusy(null) }
  }

  return <PlanningModalShell title="Envoyer la planification au CTO" subtitle={`${version.annee} · ${version.nom}`} icon={<Mail size={18} className="text-primary-foreground" />} onClose={onClose}>
    <div className="planning-dialog__form">
    <div className="planning-dialog__fields planning-dialog__fields--spaced" data-planning-fields>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p>Destinataire CTO : <strong className="break-all">{config?.recipient ?? 'À configurer sur le serveur'}</strong></p>
        <p className="mt-1 text-muted-foreground">Toute la version {version.nom} de {version.annee} sera incluse, même si l’écran est filtré. Les autres scénarios ne sont pas additionnés.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">SMTP : {config ? `${config.host}:${config.port}` : 'Chargement…'}</p>
        <button type="button" disabled={busy !== null} onClick={checkSMTP} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"><ShieldCheck size={15} />{busy === 'smtp' ? 'Vérification…' : 'Vérifier la configuration SMTP'}</button>
      </div>
      {smtpMessage && <p role="status" className={`rounded-lg p-3 text-sm ${smtpOK ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}>{smtpMessage}</p>}
      {config?.delivery_mode === 'local_capture' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Mode Mailpit : les emails sont capturés localement. Configurez un serveur SMTP de livraison pour atteindre la boîte du CTO.</p>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={useAI} disabled={busy !== null || Boolean(success)} onChange={event => { setUseAI(event.target.checked); setPreview(null) }} className="mt-1" />Ajouter un commentaire IA au résumé chiffré. Seuls les totaux agrégés sont transmis au service IA.</label>
      <button type="button" disabled={busy !== null || !config?.recipient || Boolean(success)} onClick={prepare} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy === 'preview' ? 'Préparation du résumé…' : 'Préparer l’aperçu email'}</button>
      {preview && <div className="space-y-3 rounded-lg border border-border p-4">
        <h4 className="font-semibold">Résumé annuel</h4><p className="text-sm">{preview.factual_summary}</p>
        {preview.ai_summary && <><h5 className="text-sm font-semibold">Commentaire IA · à vérifier</h5><p className="whitespace-pre-wrap text-sm text-muted-foreground">{preview.ai_summary}</p></>}
        {preview.ai_status === 'unavailable' && <p className="text-sm text-amber-800">IA indisponible : le résumé factuel et le planning complet restent inclus.</p>}
        {preview.facts.weekly_mismatch_assignments > 0 && <p className="text-sm text-amber-800">{preview.facts.weekly_mismatch_assignments} affectation(s) présentent un écart mensuel/hebdomadaire. L’email signale ces écarts sans modifier vos données.</p>}
        <p className="break-all text-xs text-muted-foreground">Pièce jointe : {preview.attachment_name}<br />Résumé · toutes les affectations mensuelles · toutes les lignes hebdomadaires enregistrées · calendrier · consultants et capacités.</p>
        <p className="text-xs text-muted-foreground">Aperçu valable 30 minutes. Si la planification change, un nouvel aperçu sera demandé.</p>
      </div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">{success}</p>}
      </div>
      <div className="planning-dialog__actions">
        <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Fermer</button>
        <button type="button" onClick={send} disabled={!preview || busy !== null || Boolean(success)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Send size={15} />{busy === 'send' ? 'Envoi en cours…' : 'Envoyer au CTO'}</button>
      </div>
    </div>
  </PlanningModalShell>
}
