import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Upload, CalendarDays, Award, Briefcase, MapPin, Mail, RefreshCw, Pencil, X, Trash2, ChevronDown, ChevronRight, Calendar, Star, Plus } from 'lucide-react'
import { api } from '@/services/api'
import { YearPicker } from '@/components/year-picker'
import { ModuleSelector } from '@/components/module-selector'
import { usePlanningYearStore } from '@/store/planningYearStore'
import { useAuthStore } from '@/store/authStore'
import { SAP_MODULES } from '@/lib/sap-modules'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Design tokens ──────────────────────────────────────────────────────────────
const S = {
  navy:      '#162B6E',
  blue:      '#1E3A8A',
  gray:      '#5A6472',
  dark:      '#0A0F1C',
  border:    '#E0E4E8',
  bgLight:   '#F5F6F8',
  white:     '#FFFFFF',
} as const

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const SENI_COLOR: Record<string, string> = {
  SENIOR:       S.navy,
  INTERMEDIATE: S.blue,
  JUNIOR:       S.gray,
}

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface Consultant {
  id: string
  code: string
  nom_complet: string
  email?: string
  seniorite: string
  main_module?: string
  other_modules?: string[]
  division?: string
  localisation?: string
  statut?: string
  is_project_manager?: boolean
  titre?: string
  department?: string
  cout_horaire?: number
  cout_journalier?: number
  cout_mensuel?: number
  est_certifie?: boolean
  certification?: string
  annees_experience_total?: number
  annees_experience_sap?: number
  seniorite_seidor?: number
  date_debut?: string
  date_fin?: string
  photo?: string
}

interface Version { id: number; nom: string; annee: number; est_actuelle: boolean }

interface WeekRow    { iso_week: number; date_debut: string; date_fin: string; heures: number }
interface MonthWeeks { mois: number; mois_label: string; total_heures: number; semaines: WeekRow[] }

interface MoisCell { heures: number; pct: number }
interface ProjetRow {
  projet_id: number
  projet_nom: string
  projet_code: string
  affectation_id: number
  mois: Record<string, MoisCell>
  total_heures: number
  taux_moyen: number
}

// ── Sub-components (top-level) ─────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={{
      background: S.white, borderRadius: 16, padding: '20px 22px',
      border: `1px solid ${S.border}`, borderLeft: `4px solid ${accent ?? S.navy}`,
      boxShadow: '0 2px 12px rgba(22,43,110,.07)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ?? S.navy, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: S.gray, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value?: string | number | boolean | null
}) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: `1px solid ${S.border}` }}>
      <Icon size={15} style={{ color: S.gray, flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: S.gray }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: S.dark, marginTop: 2 }}>{String(value)}</div>
      </div>
    </div>
  )
}

// ── Week accordion panel (top-level) ─────────────────────────────────────────
function WeekPanel({ affectationId, annee, onSaved }: {
  affectationId: number; annee: number; onSaved: () => void
}) {
  const [data,       setData]       = useState<MonthWeeks[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [openMonths, setOpenMonths] = useState<Set<number>>(new Set([1,2,3,4,5,6,7,8,9,10,11,12]))

  useEffect(() => {
    setLoading(true); setError('')
    api.get(`/planning/${affectationId}/semaines?annee=${annee}`)
      .then(r => setData(r.data))
      .catch(() => setError('Erreur de chargement des semaines'))
      .finally(() => setLoading(false))
  }, [affectationId, annee])

  function updateWeek(mi: number, si: number, val: string) {
    const h = Math.max(0, parseFloat(val) || 0)
    setData(prev => prev.map((m, i) => {
      if (i !== mi) return m
      const semaines = m.semaines.map((s, j) => j !== si ? s : { ...s, heures: h })
      return { ...m, semaines, total_heures: parseFloat(semaines.reduce((a, s) => a + s.heures, 0).toFixed(1)) }
    }))
  }

  function toggleMonth(mois: number) {
    setOpenMonths(prev => { const n = new Set(prev); n.has(mois) ? n.delete(mois) : n.add(mois); return n })
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const flat = data.flatMap(m => m.semaines.map(s => ({ iso_week: s.iso_week, annee, heures: s.heures })))
      await api.put(`/planning/${affectationId}/semaines`, flat)
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Erreur lors de la sauvegarde')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding:'16px 0', color:S.gray, fontSize:12 }}>Chargement des semaines…</div>
  if (!data.length) return <div style={{ padding:'16px 0', color:S.gray, fontSize:12 }}>Aucune semaine disponible pour {annee}</div>

  return (
    <div style={{ padding:'10px 0' }}>
      {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, padding:'7px 12px', marginBottom:8, fontSize:12, color:'#dc2626' }}>{error}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {data.map((m, mi) => (
          <div key={m.mois} style={{ border:`1px solid ${S.border}`, borderRadius:8, overflow:'hidden' }}>
            <div onClick={() => toggleMonth(m.mois)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', cursor:'pointer', userSelect:'none', background: openMonths.has(m.mois) ? '#EEF3FB' : S.bgLight }}>
              <span style={{ fontSize:12, fontWeight:700, color:S.navy }}>{m.mois_label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, fontWeight:600, color:S.dark, background:S.white, border:`1px solid ${S.border}`, padding:'1px 8px', borderRadius:5 }}>{m.total_heures.toFixed(1)}h</span>
                {openMonths.has(m.mois) ? <ChevronDown size={12} color={S.gray}/> : <ChevronRight size={12} color={S.gray}/>}
              </div>
            </div>
            {openMonths.has(m.mois) && (
              <div style={{ background:S.white }}>
                {m.semaines.map((s, si) => (
                  <div key={s.iso_week} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderBottom: si < m.semaines.length-1 ? `1px solid ${S.bgLight}` : 'none' }}>
                    <span style={{ fontSize:10, fontWeight:700, color:S.gray, fontFamily:'monospace', width:24, flexShrink:0 }}>S{s.iso_week}</span>
                    <span style={{ fontSize:10, color:'#9ca3af', flex:1 }}>{s.date_debut} → {s.date_fin}</span>
                    <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                      {[0,8,16,40].map(h => (
                        <button key={h} type="button" onClick={() => updateWeek(mi, si, String(h))}
                          style={{ fontSize:9, fontWeight:600, padding:'2px 4px', borderRadius:3, border:`1px solid ${S.border}`, cursor:'pointer', background: s.heures===h ? S.navy : S.bgLight, color: s.heures===h ? '#fff' : S.dark }}>
                          {h}h
                        </button>
                      ))}
                    </div>
                    <input type="number" min={0} step={0.5} value={s.heures||''} placeholder="0"
                      onChange={e => updateWeek(mi, si, e.target.value)}
                      style={{ width:46, padding:'3px 6px', fontSize:12, fontWeight:600, border:`1.5px solid ${S.navy}40`, borderRadius:6, outline:'none', textAlign:'right', fontFamily:'monospace' }}
                    />
                    <span style={{ fontSize:10, color:S.gray }}>h</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding:'6px 20px', borderRadius:7, fontSize:12, fontWeight:600, background:S.navy, color:'#fff', border:'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Sauvegarde…' : 'Enregistrer les semaines'}
        </button>
      </div>
    </div>
  )
}

// ── Edit modal (top-level) ────────────────────────────────────────────────────
function ConsultantEditModal({ consultant, onClose, onSaved }: {
  consultant: Consultant
  onClose: () => void
  onSaved: (updated: Consultant) => void
}) {
  const [form, setForm] = useState({
    code:                    consultant.code,
    nom_complet:             consultant.nom_complet,
    email:                   consultant.email ?? '',
    titre:                   consultant.titre ?? '',
    seniorite:               consultant.seniorite,
    main_module:             consultant.main_module ?? '',
    other_modules:           Array.isArray(consultant.other_modules) ? consultant.other_modules : [],
    division:                consultant.division ?? 'Tunisia',
    localisation:            consultant.localisation ?? 'Internal',
    statut:                  consultant.statut ?? 'Active',
    department:              consultant.department ?? 'SCM',
    is_project_manager:      consultant.is_project_manager ?? false,
    est_certifie:            consultant.est_certifie ?? false,
    certification:           consultant.certification ?? '',
    annees_experience_total: consultant.annees_experience_total ?? 0,
    annees_experience_sap:   consultant.annees_experience_sap ?? 0,
    seniorite_seidor:        consultant.seniorite_seidor ?? 0,
    date_debut:              consultant.date_debut?.toString().slice(0, 10) ?? '',
    date_fin:                consultant.date_fin?.toString().slice(0, 10) ?? '',
    cout_horaire:            consultant.cout_horaire ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const payload = { 
        ...form,
        cout_horaire: Number(form.cout_horaire),
        cout_journalier: 0, cout_mensuel: 0,
        annees_experience_total: Number(form.annees_experience_total),
        annees_experience_sap: Number(form.annees_experience_sap),
        seniorite_seidor: Number(form.seniorite_seidor),
        date_debut: form.date_debut || null,
        date_fin: form.date_fin || null,
      }
      const res = await api.put(`/consultants/${consultant.id}`, payload)
      onSaved(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const inp = (name: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: S.gray, marginBottom: 5, display: 'block', letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</label>
      <input
        name={name} type={type} value={String(form[name])} onChange={handleChange} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${S.border}`, borderRadius: 9, fontSize: 13, color: S.dark, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
        onFocus={e => { e.currentTarget.style.borderColor = S.navy }}
        onBlur={e => { e.currentTarget.style.borderColor = S.border }}
      />
    </div>
  )

  const sel = (name: keyof typeof form, label: string, options: string[]) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: S.gray, marginBottom: 5, display: 'block', letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</label>
      <select name={name} value={String(form[name])} onChange={handleChange}
        style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${S.border}`, borderRadius: 9, fontSize: 13, color: S.dark, outline: 'none', background: '#fff', cursor: 'pointer' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,10,40,.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: S.white, borderRadius: 22, width: '100%', maxWidth: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(22,43,110,.18)', border: `1px solid ${S.border}` }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 26px', borderBottom: `1px solid ${S.border}` }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: S.dark, margin: 0 }}>Modifier le consultant</h3>
            <p style={{ fontSize: 12, color: S.gray, margin: '3px 0 0' }}>{consultant.nom_complet} · {consultant.code}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.gray, padding: 4, borderRadius: 6, display: 'flex' }}><X size={18}/></button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 26px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>⚠ {error}</div>
          )}

          {/* Identité */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>Identité</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              {inp('code', 'Code', 'text', 'MAG')}
              {inp('nom_complet', 'Nom complet', 'text', 'Mohamed Amine Gharbi')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {inp('email', 'Email', 'email', 'mag@seidor.com')}
              {inp('titre', 'Titre', 'text', 'COO N&W Africa')}
            </div>
          </div>

          {/* Compétences SAP */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>Compétences SAP</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: S.gray, marginBottom: 5, display: 'block', letterSpacing: '.04em', textTransform: 'uppercase' }}>Modules SAP</label>
              <ModuleSelector
                mainModule={form.main_module}
                otherModules={form.other_modules}
                onMainChange={v => setForm(f => ({ ...f, main_module: v }))}
                onOthersChange={v => setForm(f => ({ ...f, other_modules: v }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              {sel('seniorite', 'Séniorité', ['SENIOR', 'INTERMEDIATE', 'JUNIOR'])}
              {inp('annees_experience_sap', 'Exp. SAP (ans)', 'number')}
              {inp('annees_experience_total', 'Exp. totale (ans)', 'number')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {sel('department', 'Département', ['SCM', 'FICO', 'PMO', 'Management', 'Technical-ABAP', 'Technical-Basis', 'HCM', 'Other'])}
              {inp('seniorite_seidor', 'Séniorité SEIDOR', 'number')}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" name="is_project_manager" checked={form.is_project_manager} onChange={handleChange} style={{ width: 16, height: 16, accentColor: S.navy }} />
                Project Manager
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" name="est_certifie" checked={form.est_certifie} onChange={handleChange} style={{ width: 16, height: 16, accentColor: S.navy }} />
                Certifié SAP
              </label>
            </div>
            {form.est_certifie && (
              <div style={{ marginTop: 12 }}>
                {inp('certification', 'Détail certification', 'text', 'S4 HANA sourcing and procurement')}
              </div>
            )}
          </div>

          {/* Localisation */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>Localisation & Statut</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {sel('division', 'Division', ['Tunisia', 'Morocco', 'Kenya', 'South Africa', 'Botswana', 'Mauritania', 'Ivory Coast', 'Freelance'])}
              {sel('localisation', 'Type', ['Internal', 'Subcontractor', 'Freelance'])}
              {sel('statut', 'Statut', ['Active', 'Inactive', 'To recruit'])}
            </div>
          </div>

          {/* Dates */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${S.border}` }}>Dates</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {inp('date_debut', 'Date début', 'date')}
              {inp('date_fin', 'Date fin', 'date')}
              {inp('cout_horaire', 'Coût horaire (€/h)', 'number')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 26px', borderTop: `1px solid ${S.border}`, background: S.bgLight }}>
          <button onClick={onClose} style={{ padding: '9px 22px', borderRadius: 100, fontSize: 13, background: 'transparent', color: S.gray, border: `1px solid ${S.border}`, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 24px', borderRadius: 100, fontSize: 13, fontWeight: 700, background: S.navy, color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
            <Pencil size={13} /> {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Evaluations panel (top-level) ─────────────────────────────────────────────

interface ScoreItem {
  id: number
  consultant_id: number
  evaluateur_id: number
  evaluateur_nom: string
  evaluateur_email: string
  projet_id: number | null
  projet_nom: string | null
  module: string
  note: number
  commentaire: string | null
  date_creation: string
}

const NAVY = '#162B6E'

function Stars({ note, size = 14 }: { note: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < note ? NAVY : 'none'}
          color={i < note ? NAVY : '#d1d5db'}
        />
      ))}
    </span>
  )
}

interface AllProjet { id: number; nom: string; wbs_code: string }

function EvaluationsPanel({
  consultantId,
  modules,
  currentUser,
}: {
  consultantId: string
  modules: string[]
  currentUser: { id: string; nom: string; role: string } | null
}) {
  const [scores,      setScores]     = useState<ScoreItem[]>([])
  const [allProjets,  setAllProjets] = useState<AllProjet[]>([])
  const [showForm,    setShowForm]   = useState(false)
  const [evalMode,    setEvalMode]   = useState<'skill' | 'project'>('skill')
  const [module,      setModule]     = useState('')
  const [projetId,    setProjetId]   = useState<number | null>(null)
  const [note,        setNote]       = useState(0)
  const [hovered,     setHovered]    = useState(0)
  const [commentaire, setCommentaire]= useState('')
  const [saving,      setSaving]     = useState(false)
  const [error,       setError]      = useState('')

  const canEval    = currentUser !== null
  const skillList  = modules.length > 0 ? modules : []

  useEffect(() => {
    api.get(`/scores/consultant/${consultantId}`)
      .then(r => setScores(r.data))
      .catch(() => {})
    api.get('/projets')
      .then(r => setAllProjets(r.data))
      .catch(() => {})
  }, [consultantId])

  function resetForm() {
    setShowForm(false); setNote(0); setHovered(0)
    setModule(''); setProjetId(null); setCommentaire(''); setError('')
  }

  function switchMode(m: 'skill' | 'project') {
    setEvalMode(m); setNote(0); setHovered(0); setModule(''); setProjetId(null); setError('')
  }

  async function handleSave() {
    if (evalMode === 'skill' && !module) { setError('Sélectionnez un module ou une compétence.'); return }
    if (evalMode === 'project' && !projetId) { setError('Sélectionnez un projet.'); return }
    if (note === 0) { setError('Sélectionnez une note (1–5 étoiles).'); return }
    setSaving(true); setError('')
    try {
      await api.post('/scores/', {
        consultant_id: Number(consultantId),
        projet_id:     evalMode === 'project' ? projetId : null,
        module:        evalMode === 'skill'   ? module   : 'Rendement projet',
        note,
        commentaire: commentaire.trim() || null,
      })
      const r = await api.get(`/scores/consultant/${consultantId}`)
      setScores(r.data)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Erreur lors de la sauvegarde.')
    } finally { setSaving(false) }
  }

  async function handleDelete(scoreId: number) {
    try {
      await api.delete(`/scores/${scoreId}`)
      setScores(prev => prev.filter(s => s.id !== scoreId))
    } catch {}
  }

  // Star picker shared between both modes
  function StarPicker() {
    return (
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#5A6472', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
          Note <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setNote(i + 1 === note ? 0 : i + 1)}
              onMouseEnter={() => setHovered(i + 1)}
              onMouseLeave={() => setHovered(0)}
              style={{ border: 'none', background: 'none', padding: 2, cursor: 'pointer' }}
            >
              <Star size={22} fill={(hovered || note) > i ? NAVY : 'none'} color={(hovered || note) > i ? NAVY : '#d1d5db'} />
            </button>
          ))}
          {note > 0 && <span style={{ fontSize: 12, color: '#5A6472', marginLeft: 4 }}>{note}/5</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: `1px solid #E0E4E8`, boxShadow: '0 2px 12px rgba(22,43,110,.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#5A6472' }}>
          Évaluations
        </div>
        {canEval && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: NAVY, background: '#EEF3FB', border: `1px solid ${NAVY}30`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}
          >
            <Plus size={11} /> Évaluer
          </button>
        )}
      </div>

      {/* Evaluation form */}
      {showForm && canEval && (
        <div style={{ background: '#F5F6F8', borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid #E0E4E8` }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['skill', 'project'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: evalMode === m ? NAVY : '#E0E4E8',
                  color:      evalMode === m ? '#fff' : '#5A6472',
                }}
              >
                {m === 'skill' ? 'Par compétence (module)' : 'Par projet (rendement)'}
              </button>
            ))}
          </div>

          {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{error}</div>}

          {/* Skill mode */}
          {evalMode === 'skill' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#5A6472', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>
                Module / Compétence <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={module}
                onChange={e => setModule(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: `1.5px solid ${module ? NAVY : '#E0E4E8'}`, borderRadius: 8, outline: 'none', background: '#fff', fontFamily: 'monospace', fontWeight: module ? 600 : 400 }}
              >
                <option value="">— Sélectionner un module —</option>
                {skillList.length > 0 && (
                  <optgroup label="Modules du consultant">
                    {skillList.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                )}
                <optgroup label="Autres compétences SAP">
                  {SAP_MODULES.filter(s => !skillList.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
              </select>
            </div>
          )}

          {/* Project mode */}
          {evalMode === 'project' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#5A6472', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>
                Projet <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={projetId ?? ''}
                onChange={e => setProjetId(e.target.value ? Number(e.target.value) : null)}
                style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: `1.5px solid ${projetId ? NAVY : '#E0E4E8'}`, borderRadius: 8, outline: 'none', background: '#fff', fontWeight: projetId ? 600 : 400 }}
              >
                <option value="">— Sélectionner un projet —</option>
                {allProjets.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.wbs_code})</option>)}
              </select>
            </div>
          )}

          {/* Stars */}
          <div style={{ marginBottom: 12 }}>
            <StarPicker />
          </div>

          {/* Comment */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#5A6472', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Commentaire (optionnel)</label>
            <textarea
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              rows={3}
              placeholder={evalMode === 'skill' ? 'Niveau de maîtrise, points forts, certifications…' : 'Qualité de livraison, comportement, respect des délais…'}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #E0E4E8', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1, padding: '8px 0', background: NAVY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{ padding: '8px 14px', background: 'transparent', color: '#5A6472', border: '1px solid #E0E4E8', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Score history */}
      {scores.length === 0 && !showForm ? (
        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>Aucune évaluation pour ce consultant.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...scores].sort((a, b) => b.date_creation.localeCompare(a.date_creation)).map(s => {
            const isOwn = currentUser && String(s.evaluateur_id) === currentUser.id
            const initials = s.evaluateur_nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            const isProjectScore = s.module === 'Rendement projet'
            return (
              <div key={s.id} style={{ border: `1px solid #E0E4E8`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F5F6F8', borderBottom: '1px solid #E0E4E8' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0A0F1C' }}>{s.evaluateur_nom}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>
                      {new Date(s.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  {isProjectScore && s.projet_nom ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#065f46', background: '#d1fae5', border: '1px solid #6ee7b7', padding: '2px 9px', borderRadius: 100, flexShrink: 0 }}>
                      📋 {s.projet_nom}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: NAVY, background: '#EEF3FB', border: `1px solid ${NAVY}30`, padding: '2px 9px', borderRadius: 100, flexShrink: 0 }}>
                      {s.module}
                    </span>
                  )}
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Stars note={s.note} size={14} />
                    <span style={{ fontSize: 11, color: '#5A6472' }}>{s.note}/5</span>
                  </div>
                  {s.commentaire && (
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#5A6472', fontStyle: 'italic', lineHeight: 1.5 }}>"{s.commentaire}"</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Deactivation impact modal (top-level) ────────────────────────────────────

interface ImpactCandidate {
  id: number; nom_complet: string; main_module: string | null
  other_modules: string[]; taux_occupation: number; heures_libres: number
}
interface ImpactProjet {
  projet_id: number; projet_nom: string; wbs_code: string
  has_replacements: boolean; candidates: ImpactCandidate[]
}

function DeactivationModal({ consultantId, consultantNom, onClose }: {
  consultantId: string; consultantNom: string; onClose: () => void
}) {
  const [projets, setProjets] = useState<ImpactProjet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/consultants/${consultantId}/deactivation-impact`)
      .then(r => setProjets(r.data.projets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [consultantId])

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 201, background: '#fff', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,.2)',
        width: 560, maxWidth: '95vw', maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid #E0E4E8', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A0F1C' }}>Planification impactée</div>
            <div style={{ fontSize: 12, color: '#5A6472', marginTop: 2 }}>{consultantNom} a été désactivé(e)</div>
          </div>
          <button type="button" onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 24px 24px', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #E0E4E8', borderTopColor: NAVY, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            </div>
          ) : projets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#5A6472', fontSize: 13 }}>
              ✅ Aucune affectation active — aucun impact sur la planification.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {projets.map(p => (
                <div key={p.projet_id} style={{ border: '1px solid #E0E4E8', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Project header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F5F6F8', borderBottom: '1px solid #E0E4E8' }}>
                    <Briefcase size={13} style={{ color: NAVY, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0F1C', flex: 1 }}>{p.projet_nom}</span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, color: '#5A6472', background: '#fff', border: '1px solid #E0E4E8', padding: '2px 8px', borderRadius: 6 }}>{p.wbs_code}</span>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    {p.has_replacements ? (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#5A6472', letterSpacing: '.06em', marginBottom: 8 }}>
                          Remplaçants suggérés
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {p.candidates.map(cand => (
                            <div key={cand.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#F5F6F8', borderRadius: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                                {cand.nom_complet.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0A0F1C' }}>{cand.nom_complet}</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                                  {cand.main_module && (
                                    <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, background: '#EEF3FB', color: NAVY, border: `1px solid ${NAVY}30`, padding: '1px 6px', borderRadius: 100 }}>{cand.main_module}</span>
                                  )}
                                  {cand.other_modules.slice(0, 3).map(m => (
                                    <span key={m} style={{ fontSize: 9, fontFamily: 'monospace', color: '#5A6472', background: '#fff', border: '1px solid #E0E4E8', padding: '1px 6px', borderRadius: 100 }}>{m}</span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                {/* Occupation bar */}
                                <div style={{ width: 64, height: 6, background: '#E0E4E8', borderRadius: 3, overflow: 'hidden', marginBottom: 3, marginLeft: 'auto' }}>
                                  <div style={{ height: '100%', width: `${Math.min(cand.taux_occupation, 100)}%`, background: cand.taux_occupation < 60 ? '#059669' : cand.taux_occupation < 80 ? '#d97706' : '#dc2626', borderRadius: 3 }} />
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#5A6472' }}>{cand.taux_occupation}% chargé</div>
                                <div style={{ fontSize: 9, color: '#9ca3af' }}>{cand.heures_libres}h libres</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
                        <span style={{ fontSize: 16 }}>📧</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Aucun remplaçant disponible</div>
                          <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>Un email d'alerte a été envoyé pour signaler ce poste vacant.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E0E4E8', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 22px', borderRadius: 100, background: NAVY, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            Fermer
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ConsultantDetailPage() {
  const { consultantId } = useParams({ from: '/_authenticated/consultants/$consultantId' })
  const navigate = useNavigate()
  const { selectedYear: globalYear, setSelectedYear: setGlobalYear } = usePlanningYearStore()
  const { user } = useAuthStore()

  const [consultant,      setConsultant]      = useState<Consultant | null>(null)
  const [versions,        setVersions]        = useState<Version[]>([])
  const [selectedYear,    setSelectedYear]    = useState<number | null>(globalYear)
  const [versionId,       setVersionId]       = useState<number | null>(null)
  const [projets,         setProjets]         = useState<ProjetRow[]>([])
  const [loading,         setLoading]         = useState(true)
  const [planningLoading, setPlanningLoading] = useState(false)
  const [uploading,       setUploading]       = useState(false)
  const [showEdit,             setShowEdit]             = useState(false)
  const [showDeactivation,     setShowDeactivation]     = useState(false)
  const [expandedWeeks,        setExpandedWeeks]        = useState<Set<number>>(new Set())
  const [showDelete,           setShowDelete]           = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [deleteError,     setDeleteError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleDelete() {
    if (!consultant) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/consultants/${consultant.id}`)
      await navigate({ to: '/consultants' })
    } catch {
      setDeleteError('Erreur lors de la suppression.')
      setDeleting(false)
    }
  }

  // ── Init : charger consultant + versions ──────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get(`/consultants/${consultantId}`),
      api.get('/planning/versions'),
    ]).then(([cRes, vRes]) => {
      setConsultant(cRes.data)
      const vlist: Version[] = vRes.data
      setVersions(vlist)
      const years = [...new Set(vlist.map(v => v.annee))]
        .filter(y => y >= 1990 && y <= 2100)
        .sort((a, b) => b - a)
      if (years.length === 0) return
      // Use the globally selected year if it has data; otherwise fall back to the most recent
      const yearToUse = globalYear && years.includes(globalYear) ? globalYear : years[0]
      setSelectedYear(yearToUse)
      if (!globalYear || !years.includes(globalYear)) setGlobalYear(yearToUse)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [consultantId])

  // ── Quand l'année change → choisir la version active de cette année ────────
  useEffect(() => {
    if (!selectedYear || !versions.length) return
    const forYear = versions.filter(v => v.annee === selectedYear)
    const active  = forYear.find(v => v.est_actuelle) ?? forYear[0]
    setVersionId(active?.id ?? null)
  }, [selectedYear, versions])

  // ── Quand versionId change → charger le planning ──────────────────────────
  useEffect(() => {
    if (!versionId) return
    fetchPlanning(versionId)
  }, [versionId, consultantId])

  function fetchPlanning(vid: number) {
    setPlanningLoading(true)
    api.get(`/planning/detail-par-consultant?version_id=${vid}`)
      .then(r => {
        const row = r.data.find((c: any) => String(c.consultant_id) === String(consultantId))
        setProjets(row?.projets ?? [])
      })
      .catch(() => setProjets([]))
      .finally(() => setPlanningLoading(false))
  }

  function refreshPlanning() {
    if (versionId) fetchPlanning(versionId)
    setExpandedWeeks(new Set())
  }

  function toggleWeeks(affId: number) {
    setExpandedWeeks(prev => {
      const n = new Set(prev)
      n.has(affId) ? n.delete(affId) : n.add(affId)
      return n
    })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !consultant) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/consultants/${consultantId}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setConsultant(res.data)
    } catch (err) {
      console.error('Photo upload failed', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${S.border}`, borderTopColor: S.navy, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    )
  }

  if (!consultant) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠</div>
        <p style={{ color: S.gray }}>Consultant introuvable.</p>
        <button onClick={() => navigate({ to: '/consultants' })}
          style={{ marginTop: 16, padding: '9px 22px', borderRadius: 100, background: S.navy, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          ← Retour
        </button>
      </div>
    )
  }

  const initials    = consultant.nom_complet.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  const seniColor   = SENI_COLOR[consultant.seniorite] ?? S.gray
  const totalHeures = projets.reduce((s, p) => s + p.total_heures, 0)
  const otherMods = Array.isArray(consultant.other_modules) ? consultant.other_modules : []
  const activeVersionNom = versions.find(v => v.id === versionId)?.nom ?? ''

  return (
    <div className="space-y-6">

      {/* Edit modal */}
      {showEdit && consultant && (
        <ConsultantEditModal
          consultant={consultant}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            const wasActive = consultant.statut !== 'Inactive'
            const nowInactive = updated.statut === 'Inactive'
            setConsultant(updated)
            setShowEdit(false)
            if (wasActive && nowInactive) setShowDeactivation(true)
          }}
        />
      )}

      {/* Deactivation impact modal */}
      {showDeactivation && consultant && (
        <DeactivationModal
          consultantId={String(consultant.id)}
          consultantNom={consultant.nom_complet}
          onClose={() => setShowDeactivation(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {showDelete && consultant && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, backdropFilter: 'blur(2px)' }}
            onClick={() => !deleting && setShowDelete(false)}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 101, background: '#fff', borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,.18)',
            padding: '32px 36px', width: 420, maxWidth: '90vw',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: S.dark }}>Supprimer le consultant</div>
                <div style={{ fontSize: 12, color: S.gray, marginTop: 2 }}>Cette action est irréversible</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: S.gray, lineHeight: 1.6, margin: '0 0 8px' }}>
              Vous êtes sur le point de supprimer définitivement le profil de{' '}
              <strong style={{ color: S.dark }}>{consultant.nom_complet}</strong>{' '}
              ({consultant.code}). Toutes ses affectations seront également supprimées.
            </p>

            {deleteError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                style={{ padding: '9px 20px', borderRadius: 100, background: S.bgLight, color: S.gray, border: `1.5px solid ${S.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 100, background: deleting ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', cursor: deleting ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                <Trash2 size={13} />
                {deleting ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate({ to: '/consultants' })}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: S.gray, fontSize: 13, fontWeight: 500, padding: 0 }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = S.navy }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = S.gray }}
      >
        <ArrowLeft size={16} /> Retour aux consultants
      </button>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{ background: S.white, borderRadius: 24, border: `1px solid ${S.border}`, boxShadow: '0 4px 24px rgba(22,43,110,.08)', overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(135deg, ${S.navy}, ${S.blue})`, height: 120, position: 'relative' }}>
          <div style={{
            position: 'absolute', right: 24, bottom: -48,
            width: 96, height: 96, borderRadius: '50%',
            border: `4px solid ${S.white}`,
            background: consultant.photo ? 'transparent' : `linear-gradient(135deg, ${S.navy}, ${S.blue})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(22,43,110,.3)',
          }} onClick={() => fileRef.current?.click()}>
            {consultant.photo
              ? <img src={`${API_URL}${consultant.photo}`} alt={consultant.nom_complet} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,.85)' }}>{initials}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em' }}>{consultant.code}</span>
                </div>
            }
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: uploading ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={20} style={{ color: '#fff' }} />
            </div>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />

        <div style={{ padding: '60px 28px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ padding: '3px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', background: seniColor, color: '#fff' }}>
                  {consultant.seniorite}
                </span>
                {consultant.is_project_manager && (
                  <span style={{ padding: '3px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', background: '#059669', color: '#fff' }}>
                    Project Manager
                  </span>
                )}
                {consultant.est_certifie && (
                  <span style={{ padding: '3px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', background: '#d97706', color: '#fff' }}>
                    Certifié SAP
                  </span>
                )}
                <span style={{
                  padding: '3px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase',
                  background: consultant.statut === 'Active' ? '#d1fae5' : '#fee2e2',
                  color: consultant.statut === 'Active' ? '#065f46' : '#991b1b',
                }}>
                  {consultant.statut}
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: S.dark, letterSpacing: '-.02em', marginBottom: 4 }}>{consultant.nom_complet}</h1>
              {consultant.titre && <p style={{ fontSize: 14, color: S.gray, marginBottom: 8 }}>{consultant.titre}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: S.navy, background: '#EEF3FB', padding: '2px 10px', borderRadius: 6 }}>{consultant.code}</span>
                {consultant.main_module && (
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: S.blue, background: '#EEF3FB', padding: '2px 10px', borderRadius: 6 }}>{consultant.main_module}</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <button
                onClick={() => setShowEdit(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 100, background: S.navy, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(22,43,110,.3)' }}
              >
                <Pencil size={13} /> Modifier le profil
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 100, background: S.bgLight, color: S.navy, border: `1.5px solid ${S.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                <Upload size={13} /> {consultant.photo ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              <button
                onClick={() => { setShowDelete(true); setDeleteError('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 100, background: '#fff5f5', color: '#dc2626', border: '1.5px solid #fca5a5', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                <Trash2 size={13} /> Supprimer le consultant
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Exp. SAP"          value={`${consultant.annees_experience_sap ?? 0} ans`}  sub="Expérience SAP"        accent={S.navy} />
        <StatCard label="Exp. totale"       value={`${consultant.annees_experience_total ?? 0} ans`} sub="Toutes technologies"   accent={S.blue} />
        <StatCard label="Séniorité SEIDOR"  value={consultant.seniorite_seidor ?? 0}                 sub="Niveau interne"        accent="#059669" />
        <StatCard label="Heures planifiées" value={`${totalHeures}h`}                                sub={`${projets.length} projet${projets.length !== 1 ? 's' : ''}`} accent="#d97706" />
      </div>

      {/* ── Compétences SAP ───────────────────────────────────────────── */}
      <div style={{ background: S.white, borderRadius: 20, padding: '22px 26px', border: `1px solid ${S.border}`, boxShadow: '0 2px 12px rgba(22,43,110,.07)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray, marginBottom: 16 }}>Compétences SAP</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Module principal */}
          {consultant.main_module && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 9, color: S.gray, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>Module principal</span>
              <span style={{ padding: '6px 18px', borderRadius: 100, background: S.navy, color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '.02em' }}>
                {consultant.main_module}
              </span>
            </div>
          )}

          {/* Séparateur */}
          {otherMods.length > 0 && (
            <div style={{ width: 1, height: 36, background: S.border, flexShrink: 0 }} />
          )}

          {/* Autres modules */}
          {otherMods.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, color: S.gray, letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>Autres modules</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {otherMods.map(m => (
                  <span key={m} style={{
                    padding: '5px 14px', borderRadius: 100,
                    background: '#EEF3FB', color: S.navy,
                    fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${S.navy}20`,
                  }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expérience */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexShrink: 0 }}>
            {(consultant.annees_experience_sap ?? 0) > 0 && (
              <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 12, background: S.bgLight, border: `1px solid ${S.border}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: S.navy, lineHeight: 1 }}>{consultant.annees_experience_sap}</div>
                <div style={{ fontSize: 9, color: S.gray, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>ans SAP</div>
              </div>
            )}
            {(consultant.annees_experience_total ?? 0) > 0 && (
              <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 12, background: S.bgLight, border: `1px solid ${S.border}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: S.blue, lineHeight: 1 }}>{consultant.annees_experience_total}</div>
                <div style={{ fontSize: 9, color: S.gray, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>ans exp.</div>
              </div>
            )}
          </div>
        </div>

        {/* Certification */}
        {consultant.est_certifie && consultant.certification && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: '3px 12px', borderRadius: 100, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, border: '1px solid #fcd34d' }}>
              🏆 Certifié SAP
            </span>
            <span style={{ fontSize: 12, color: S.gray }}>{consultant.certification}</span>
          </div>
        )}
      </div>

      {/* ── Infos + Planning ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: Informations + Evaluations stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: S.white, borderRadius: 20, padding: '24px', border: `1px solid ${S.border}`, boxShadow: '0 2px 12px rgba(22,43,110,.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray, marginBottom: 16 }}>Informations</div>
            <InfoRow icon={Mail}        label="Email"            value={consultant.email} />
            <InfoRow icon={MapPin}      label="Division"         value={consultant.division} />
            <InfoRow icon={MapPin}      label="Type"             value={consultant.localisation} />
            <InfoRow icon={Briefcase}   label="Département"      value={consultant.department} />
            <InfoRow icon={Award}       label="Module principal" value={consultant.main_module} />
            {otherMods.length > 0 && <InfoRow icon={Award} label="Autres modules" value={otherMods.join(', ')} />}
            {consultant.certification  && <InfoRow icon={Award}        label="Certification"  value={consultant.certification} />}
            {consultant.date_debut     && <InfoRow icon={CalendarDays} label="Date début"     value={consultant.date_debut.toString().slice(0, 10)} />}
            {consultant.date_fin       && <InfoRow icon={CalendarDays} label="Date fin"       value={consultant.date_fin.toString().slice(0, 10)} />}
            {(consultant.cout_horaire ?? 0) > 0 && <InfoRow icon={Briefcase} label="Coût horaire" value={`${consultant.cout_horaire} €/h`} />}
          </div>
          <EvaluationsPanel
            consultantId={consultantId}
            modules={[
              ...(consultant.main_module ? [consultant.main_module] : []),
              ...(consultant.other_modules ?? []),
            ]}
            currentUser={user ? { id: String(user.id), nom: user.nom, role: user.role } : null}
          />
        </div>

        {/* Right: Planning */}
        <div style={{ background: S.white, borderRadius: 20, border: `1px solid ${S.border}`, boxShadow: '0 2px 12px rgba(22,43,110,.07)', overflow: 'hidden' }}>

          {/* Planning header */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: S.gray }}>
              Planification
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Sélecteur d'année */}
              {selectedYear !== null && (
                <YearPicker
                  value={selectedYear}
                  onChange={y => { setSelectedYear(y); setGlobalYear(y) }}
                />
              )}

              {/* Version active — label informatif */}
              {activeVersionNom && (
                <span style={{ fontSize: 11, color: S.navy, background: '#EEF3FB', padding: '4px 12px', borderRadius: 100, fontWeight: 600, border: `1px solid ${S.navy}25` }}>
                  {activeVersionNom}
                </span>
              )}

              {/* Bouton Actualiser */}
              <button
                onClick={refreshPlanning}
                disabled={planningLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 100,
                  background: 'transparent', border: `1.5px solid ${S.border}`,
                  cursor: planningLoading ? 'not-allowed' : 'pointer',
                  fontSize: 11, fontWeight: 600, color: S.navy,
                  opacity: planningLoading ? .5 : 1,
                  transition: 'border-color .15s',
                }}
                onMouseEnter={e => { if (!planningLoading) (e.currentTarget as HTMLElement).style.borderColor = S.navy }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = S.border }}
              >
                <RefreshCw size={12} style={{ animation: planningLoading ? 'spin .7s linear infinite' : 'none' }} />
                {planningLoading ? 'Chargement…' : 'Actualiser'}
              </button>
            </div>
          </div>

          {/* Planning body */}
          {projets.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: S.gray }}>
              <CalendarDays size={36} style={{ margin: '0 auto 12px', opacity: .3 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: S.dark }}>Aucun projet planifié</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>pour {selectedYear ?? 'cette période'}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: S.bgLight, borderBottom: `1px solid ${S.border}` }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: S.gray, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>Projet</th>
                    {MOIS_LABELS.map(m => (
                      <th key={m} style={{ padding: '10px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: S.gray, minWidth: 52 }}>{m}</th>
                    ))}
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: S.gray }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {projets.map(p => (
                    <React.Fragment key={p.affectation_id}>
                      <tr style={{ borderBottom: expandedWeeks.has(p.affectation_id) ? 'none' : `1px solid ${S.border}` }}>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: S.dark }}>{p.projet_nom}</div>
                          <div style={{ fontSize: 10, color: S.gray, fontFamily: 'monospace', marginBottom: 4 }}>{p.projet_code}</div>
                          <button
                            onClick={() => toggleWeeks(p.affectation_id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                              border: `1px solid ${expandedWeeks.has(p.affectation_id) ? S.navy : S.border}`,
                              background: expandedWeeks.has(p.affectation_id) ? '#EEF3FB' : S.bgLight,
                              color: expandedWeeks.has(p.affectation_id) ? S.navy : S.gray,
                              cursor: 'pointer',
                            }}
                          >
                            <Calendar size={9} />
                            Semaines
                            {expandedWeeks.has(p.affectation_id) ? <ChevronDown size={9}/> : <ChevronRight size={9}/>}
                          </button>
                        </td>
                        {MOIS_LABELS.map(m => {
                          const cell = p.mois[m] ?? { heures: 0, pct: 0 }
                          const h = cell.heures
                          return (
                            <td key={m} style={{ padding: '10px 6px', textAlign: 'center' }}>
                              {h > 0 ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: 44, height: 24, borderRadius: 6,
                                  background: cell.pct > 100 ? '#fee2e2' : cell.pct >= 80 ? '#fef3c7' : '#d1fae5',
                                  color: cell.pct > 100 ? '#991b1b' : cell.pct >= 80 ? '#92400e' : '#065f46',
                                  fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                                }}>
                                  {h}h
                                </span>
                              ) : (
                                <span style={{ color: S.border, fontSize: 11 }}>—</span>
                              )}
                            </td>
                          )
                        })}
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 10px', borderRadius: 6, background: '#EEF3FB', color: S.navy, fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>
                            {p.total_heures}h
                          </span>
                        </td>
                      </tr>
                      {expandedWeeks.has(p.affectation_id) && selectedYear && (
                        <tr key={`weeks-${p.affectation_id}`} style={{ borderBottom: `1px solid ${S.border}` }}>
                          <td colSpan={14} style={{ padding: '0 24px 12px', background: '#f8faff' }}>
                            <WeekPanel
                              affectationId={p.affectation_id}
                              annee={selectedYear}
                              onSaved={refreshPlanning}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: S.bgLight, borderTop: `2px solid ${S.border}` }}>
                    <td style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: S.navy }}>TOTAL</td>
                    {MOIS_LABELS.map(m => {
                      const h = projets.reduce((s, p) => s + (p.mois[m]?.heures ?? 0), 0)
                      return (
                        <td key={m} style={{ padding: '10px 6px', textAlign: 'center' }}>
                          {h > 0
                            ? <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: S.navy }}>{h}h</span>
                            : <span style={{ color: S.border, fontSize: 11 }}>—</span>
                          }
                        </td>
                      )
                    })}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: S.navy }}>{totalHeures}h</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
