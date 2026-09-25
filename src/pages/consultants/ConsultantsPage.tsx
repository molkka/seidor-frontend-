import { useEffect, useState } from 'react'
import { Search, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/services/api'
import { useT } from '@/hooks/useT'
import { ModuleSelector } from '@/components/module-selector'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Design tokens (SEIDOR palette) ────────────────────────────────────────────
const S = {
  navy:      '#162B6E',
  blue:      '#1E3A8A',
  gray:      '#5A6472',
  dark:      '#0A0F1C',
  border:    '#E0E4E8',
  bgLight:   '#F5F6F8',
  white:     '#FFFFFF',
} as const

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface Consultant {
  id: string
  code: string
  nom_complet: string
  email?: string
  seniorite: string
  main_module: string
  division?: string
  localisation?: string
  statut?: string
  is_project_manager?: boolean
  titre?: string
  other_modules?: string[]
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

interface FormData {
  code: string
  nom_complet: string
  email: string
  seniorite: string
  main_module: string
  division: string
  localisation: string
  statut: string
  is_project_manager: boolean
  titre: string
  other_modules: string[]
  department: string
  cout_horaire: number
  cout_journalier: number
  cout_mensuel: number
  est_certifie: boolean
  certification: string
  annees_experience_total: number
  annees_experience_sap: number
  seniorite_seidor: number
  date_debut: string
  date_fin: string
}

const EMPTY_FORM: FormData = {
  code: '', nom_complet: '', email: '',
  seniorite: 'SENIOR', main_module: '',
  division: 'Tunisia', localisation: 'Internal', statut: 'Active',
  is_project_manager: false,
  titre: '', other_modules: [], department: 'SCM',
  cout_horaire: 0, cout_journalier: 0, cout_mensuel: 0,
  est_certifie: false, certification: '',
  annees_experience_total: 0, annees_experience_sap: 0,
  seniorite_seidor: 0, date_debut: '', date_fin: '',
}


// ── Form field components (top-level) ─────────────────────────────────────────

const Field = ({
  name, label, placeholder = '', type = 'text', required = false, value, onChange,
}: {
  name: string; label: string; placeholder?: string; type?: string
  required?: boolean; value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    <input
      name={name} value={value} onChange={onChange} type={type} placeholder={placeholder}
      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
)

const SelectField = ({
  name, label, options, required = false, value, onChange,
}: {
  name: string; label: string; options: string[]; required?: boolean; value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    <select
      name={name} value={value} onChange={onChange}
      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
)

const SectionTitle = ({ title }: { title: string }) => (
  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b border-border">
    {title}
  </p>
)

// ── Consultant Card (top-level) ────────────────────────────────────────────────
// Par défaut : photo + infos légères en bas
// Au hover   : overlay bleu animé + tous les détails + "Voir plus" centré + "Modifier" en haut
function ConsultantCard({ c, onEdit, onView }: {
  c: Consultant
  onEdit: () => void
  onView: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const initials = c.nom_complet
    .split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  const otherMods = Array.isArray(c.other_modules) ? c.other_modules : []

  return (
    <div
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        aspectRatio: '3/4', cursor: 'pointer',
        boxShadow: hovered
          ? '0 20px 52px rgba(0,114,163,.28)'
          : '0 4px 20px rgba(0,0,0,.10)',
        transform: hovered ? 'translateY(-5px)' : 'none',
        transition: 'transform .3s ease, box-shadow .3s ease',
      }}
    >
      {/* ── Photo ou placeholder ── */}
      {c.photo ? (
        <img
          src={`${API_URL}${c.photo}`}
          alt={c.nom_complet}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #dceefa 0%, #a8cceb 55%, #6aaad4 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0072A3, #009FCC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(0,114,163,.4)',
          }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>{initials}</span>
          </div>
        </div>
      )}

      {/* ── Gradient discret par défaut (lisibilité du texte) ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,.55) 30%, transparent 65%)',
        opacity: hovered ? 0 : 1,
        transition: 'opacity .3s ease',
      }} />

      {/* ── Overlay bleu au hover ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,80,150,.72) 0%, rgba(0,55,110,.97) 100%)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity .35s ease',
      }} />

      {/* ── Inactive warning badge ── */}
      {c.statut === 'Inactive' && (
        <div
          title="Consultant inactif — planification à revoir"
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 4,
            background: '#f97316', color: '#fff',
            borderRadius: '50%', width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800,
            boxShadow: '0 2px 8px rgba(249,115,22,.5)',
          }}
        >
          !
        </div>
      )}

      {/* ── Bouton Modifier — haut droit, visible au hover seulement ── */}
      <button
        onClick={e => { e.stopPropagation(); onEdit() }}
        style={{
          position: 'absolute', top: 14, right: 14, zIndex: 3,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 13px', borderRadius: 100,
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
          color: '#0072A3', border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,.15)',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity .3s ease, transform .3s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.92)' }}
      >
        <Pencil size={11} /> Modifier
      </button>

      {/* ── État par défaut : nom + infos en bas ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 18px',
        opacity: hovered ? 0 : 1,
        transition: 'opacity .2s ease',
        pointerEvents: hovered ? 'none' : 'auto',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
          {c.nom_complet}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.72)' }}>
          {c.main_module}{c.division ? ` · ${c.division}` : ''}
          {(c.annees_experience_sap ?? 0) > 0 ? ` · ${c.annees_experience_sap} ans SAP` : ''}
        </div>
      </div>

      {/* ── État hover : détails animés + "Voir plus" centré ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '60px 20px 28px', textAlign: 'center',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity .35s ease, transform .35s ease',
        pointerEvents: hovered ? 'auto' : 'none',
      }}>
        {/* Nom */}
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 12 }}>
          {c.nom_complet}
        </div>

        {/* Module principal */}
        {c.main_module && (
          <div style={{ marginBottom: 8 }}>
            <span style={{
              padding: '5px 18px', borderRadius: 100,
              background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.4)',
              color: '#fff', fontSize: 13, fontWeight: 700,
            }}>
              {c.main_module}
            </span>
          </div>
        )}

        {/* Autres modules */}
        {otherMods.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 10 }}>
            {otherMods.slice(0, 4).map(m => (
              <span key={m} style={{
                padding: '3px 10px', borderRadius: 100,
                background: 'rgba(255,255,255,.13)', color: 'rgba(255,255,255,.88)',
                fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,255,255,.25)',
              }}>{m}</span>
            ))}
          </div>
        )}

        {/* Années SAP */}
        {(c.annees_experience_sap ?? 0) > 0 && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 22 }}>
            {c.annees_experience_sap} ans d'expérience SAP
          </div>
        )}

        {/* Bouton "Voir plus" centré */}
        <button
          onClick={e => { e.stopPropagation(); onView() }}
          style={{
            padding: '11px 32px', borderRadius: 100,
            background: '#fff', color: '#0072A3',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            boxShadow: '0 4px 18px rgba(0,0,0,.18)',
            transition: 'transform .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        >
          Voir plus
        </button>
      </div>
    </div>
  )
}

// ── Modal Créer / Modifier (top-level) ─────────────────────────────────────────
function ConsultantModal({ initial, editId, onClose, onSaved }: {
  initial?: FormData
  editId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormData>(initial ?? EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!editId

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  const handleSubmit = async () => {
    if (!form.code) return setError('Le code est obligatoire')
    if (!form.nom_complet) return setError('Le nom est obligatoire')
    if (!form.email) return setError("L'email est obligatoire")
    if (!form.main_module) return setError('Le module principal est obligatoire')
    if (!form.division) return setError('La division est obligatoire')

    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        cout_horaire: Number(form.cout_horaire),
        cout_journalier: Number(form.cout_journalier),
        cout_mensuel: Number(form.cout_mensuel),
        annees_experience_total: Number(form.annees_experience_total),
        annees_experience_sap: Number(form.annees_experience_sap),
        seniorite_seidor: Number(form.seniorite_seidor),
        date_debut: form.date_debut || null,
        date_fin: form.date_fin || null,
      }
      if (isEdit) {
        await api.put(`/consultants/${editId}`, payload)
      } else {
        await api.post('/consultants', payload)
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,10,40,.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{
        background: S.white, borderRadius: 20, width: '100%', maxWidth: 680,
        boxShadow: '0 32px 80px rgba(22,43,110,.18)',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        border: `1px solid ${S.border}`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${S.border}` }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: S.dark }}>
              {isEdit ? 'Modifier consultant' : 'Nouveau consultant'}
            </h3>
            <p style={{ fontSize: 12, color: S.gray, marginTop: 2 }}>
              Champs avec <span style={{ color: '#dc2626' }}>*</span> sont obligatoires
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.gray, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              ⚠ {error}
            </div>
          )}
          <div className="space-y-4">
            <SectionTitle title="Identité" />
            <div className="grid grid-cols-2 gap-4">
              <Field name="code" label="Code" placeholder="ex: MAG" required value={form.code} onChange={handleChange} />
              <Field name="nom_complet" label="Nom complet" placeholder="ex: Mohamed Amine Gharbi" required value={form.nom_complet} onChange={handleChange} />
              <Field name="email" label="Email" placeholder="ex: mag@seidor.com" type="email" required value={form.email} onChange={handleChange} />
              <Field name="titre" label="Titre" placeholder="ex: COO N&W Africa" value={form.titre} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-4">
            <SectionTitle title="Profil SAP" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Modules SAP <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <ModuleSelector
                  mainModule={form.main_module}
                  otherModules={form.other_modules}
                  onMainChange={v => setForm(f => ({ ...f, main_module: v }))}
                  onOthersChange={v => setForm(f => ({ ...f, other_modules: v }))}
                />
              </div>
              <SelectField name="seniorite" label="Séniorité" required options={['SENIOR', 'INTERMEDIATE', 'JUNIOR']} value={form.seniorite} onChange={handleChange} />
              <SelectField name="department" label="Département" options={['SCM', 'FICO', 'PMO', 'Management', 'Technical-ABAP', 'Technical-Basis', 'HCM', 'Other']} value={form.department} onChange={handleChange} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="pm" checked={form.is_project_manager} onChange={e => setForm({ ...form, is_project_manager: e.target.checked })} style={{ width: 16, height: 16, accentColor: S.navy, cursor: 'pointer' }} />
              <label htmlFor="pm" style={{ fontSize: 13, cursor: 'pointer' }}>Project Manager</label>
            </div>
          </div>
          <div className="space-y-4">
            <SectionTitle title="Localisation" />
            <div className="grid grid-cols-3 gap-4">
              <SelectField name="division" label="Division" required options={['Tunisia', 'Morocco', 'Kenya', 'South Africa', 'Botswana', 'Mauritania', 'Ivory Coast', 'Freelance']} value={form.division} onChange={handleChange} />
              <SelectField name="localisation" label="Type" required options={['Internal', 'Subcontractor', 'Freelance']} value={form.localisation} onChange={handleChange} />
              <SelectField name="statut" label="Statut" required options={['Active', 'Inactive', 'To recruit']} value={form.statut} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-4">
            <SectionTitle title="Expérience" />
            <div className="grid grid-cols-3 gap-4">
              <Field name="annees_experience_total" label="Exp. totale (ans)" type="number" value={form.annees_experience_total} onChange={handleChange} />
              <Field name="annees_experience_sap" label="Exp. SAP (ans)" type="number" value={form.annees_experience_sap} onChange={handleChange} />
              <Field name="seniorite_seidor" label="Séniorité SEIDOR" type="number" value={form.seniorite_seidor} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field name="date_debut" label="Date début" type="date" value={form.date_debut} onChange={handleChange} />
              <Field name="date_fin" label="Date fin" type="date" value={form.date_fin} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-4">
            <SectionTitle title="Certification" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="cert" checked={form.est_certifie} onChange={e => setForm({ ...form, est_certifie: e.target.checked })} style={{ width: 16, height: 16, accentColor: S.navy, cursor: 'pointer' }} />
              <label htmlFor="cert" style={{ fontSize: 13, cursor: 'pointer' }}>Certifié SAP</label>
            </div>
            {form.est_certifie && (
              <Field name="certification" label="Détail certification" placeholder="ex: S4 HANA sourcing and procurement" value={form.certification} onChange={handleChange} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: `1px solid ${S.border}`, background: S.bgLight }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 100, fontSize: 13, fontWeight: 500, background: 'transparent', color: S.gray, border: `1px solid ${S.border}`, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 100, fontSize: 13, fontWeight: 700, background: S.navy, color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? 'Sauvegarde…' : isEdit ? 'Enregistrer' : 'Créer consultant'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Suppression (top-level) ──────────────────────────────────────────────
function DeleteModal({ consultant, onClose, onDeleted }: {
  consultant: Consultant
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await api.delete(`/consultants/${consultant.id}`)
      onDeleted()
      onClose()
    } catch {
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,10,40,.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: S.white, borderRadius: 20, width: '100%', maxWidth: 400, padding: 28, boxShadow: '0 32px 80px rgba(22,43,110,.18)', border: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} style={{ color: '#dc2626' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: S.dark }}>Supprimer consultant</h3>
        </div>
        <p style={{ fontSize: 13, color: S.gray, marginBottom: 24 }}>
          Vous allez supprimer <strong style={{ color: S.dark }}>{consultant.nom_complet} ({consultant.code})</strong>. Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 100, fontSize: 13, background: 'transparent', color: S.gray, border: `1px solid ${S.border}`, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleDelete} disabled={loading} style={{ padding: '9px 20px', borderRadius: 100, fontSize: 13, fontWeight: 700, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ConsultantsPage() {
  const navigate = useNavigate()
  const t = useT().consultants
  const [consultants, setConsultants]           = useState<Consultant[]>([])
  const [search, setSearch]                     = useState('')
  const [filterSen, setFilterSen]               = useState('ALL')
  const [filterDiv, setFilterDiv]               = useState('ALL')
  const [loading, setLoading]                   = useState(true)
  const [showCreate, setShowCreate]             = useState(false)
  const [editConsultant, setEditConsultant]     = useState<Consultant | null>(null)
  const [deleteConsultant, setDeleteConsultant] = useState<Consultant | null>(null)

  const fetchConsultants = () => {
    setLoading(true)
    api.get('/consultants')
      .then(r => setConsultants(r.data))
      .catch(err => console.error('API error:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchConsultants() }, [])

  const filtered = consultants.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.nom_complet.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.main_module || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    const matchSen = filterSen === 'ALL' || c.seniorite === filterSen
    const matchDiv = filterDiv === 'ALL' || c.division === filterDiv
    return matchSearch && matchSen && matchDiv
  })

  const toFormData = (c: Consultant): FormData => ({
    code: c.code,
    nom_complet: c.nom_complet,
    email: c.email || '',
    seniorite: c.seniorite,
    main_module: c.main_module || '',
    division: c.division || 'Tunisia',
    localisation: c.localisation || 'Internal',
    statut: c.statut || 'Active',
    is_project_manager: c.is_project_manager || false,
    titre: c.titre || '',
    other_modules: Array.isArray(c.other_modules) ? c.other_modules : [],
    department: c.department || 'SCM',
    cout_horaire: c.cout_horaire || 0,
    cout_journalier: c.cout_journalier || 0,
    cout_mensuel: c.cout_mensuel || 0,
    est_certifie: c.est_certifie || false,
    certification: c.certification || '',
    annees_experience_total: c.annees_experience_total || 0,
    annees_experience_sap: c.annees_experience_sap || 0,
    seniorite_seidor: c.seniorite_seidor || 0,
    date_debut: c.date_debut?.toString().slice(0, 10) || '',
    date_fin: c.date_fin?.toString().slice(0, 10) || '',
  })

  const divisions = [...new Set(consultants.map(c => c.division).filter(Boolean))] as string[]

  return (
    <div className="space-y-6">

      {/* Modals */}
      {showCreate && <ConsultantModal onClose={() => setShowCreate(false)} onSaved={fetchConsultants} />}
      {editConsultant && (
        <ConsultantModal
          editId={editConsultant.id}
          initial={toFormData(editConsultant)}
          onClose={() => setEditConsultant(null)}
          onSaved={fetchConsultants}
        />
      )}
      {deleteConsultant && (
        <DeleteModal
          consultant={deleteConsultant}
          onClose={() => setDeleteConsultant(null)}
          onDeleted={fetchConsultants}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: `1px solid ${S.border}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: S.navy, marginBottom: 6 }}>
            SAP Africa · Équipe
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: S.dark, letterSpacing: '-.02em', lineHeight: 1.1 }}>
            {t.title}
          </h2>
          <p style={{ fontSize: 13, color: S.gray, marginTop: 4 }}>
            {consultants.length} consultant{consultants.length !== 1 ? 's' : ''} · {filtered.length} affiché{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 22px', borderRadius: 100,
            background: S.navy, color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(22,43,110,.3)',
            transition: 'background .18s, box-shadow .18s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = S.blue }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = S.navy }}
        >
          <Plus size={15} /> {t.addBtn}
        </button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: S.gray, pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              border: `1.5px solid ${S.border}`, borderRadius: 100,
              fontSize: 13, color: S.dark, background: S.white, outline: 'none',
              transition: 'border-color .18s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = S.navy }}
            onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = S.border }}
          />
        </div>

        {(['ALL', 'SENIOR', 'INTERMEDIATE', 'JUNIOR'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterSen(s)}
            style={{
              padding: '7px 16px', borderRadius: 100,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${filterSen === s ? S.navy : S.border}`,
              background: filterSen === s ? S.navy : 'transparent',
              color: filterSen === s ? '#fff' : S.gray,
              transition: 'all .18s',
            }}
          >
            {s === 'ALL' ? 'Tous' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}

        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 100,
            fontSize: 12, color: S.dark, background: S.white,
            border: `1.5px solid ${S.border}`, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="ALL">Toutes divisions</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* ── Card grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 16, aspectRatio: '3/4',
              background: 'linear-gradient(135deg, #E0E4E8, #F5F6F8)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: S.gray }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: S.dark }}>Aucun consultant trouvé</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {search ? `Aucun résultat pour "${search}"` : 'Commencez par ajouter un consultant'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 28,
        }}>
          {filtered.map(c => (
            <ConsultantCard
              key={c.id}
              c={c}
              onEdit={() => setEditConsultant(c)}
              onView={() => navigate({ to: '/consultants/$consultantId', params: { consultantId: String(c.id) } })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
