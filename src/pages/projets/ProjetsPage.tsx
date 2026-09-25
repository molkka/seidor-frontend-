import { useEffect, useState } from 'react'
import { Search, Plus, X, Pencil, Trash2, Users } from 'lucide-react'
import { api } from '@/services/api'
import { useT } from '@/hooks/useT'
import { YearPicker } from '@/components/year-picker'

// ─── Constantes planning ───────────────────────────────────────
const MOIS_KEYS   = ['jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec']
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const EMPTY_HOURS = Object.fromEntries(MOIS_KEYS.map(k => [k, '']))

const VERSION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'V1.3':    { label:'Optimiste',  color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe' },
  'V1.2':    { label:'Reel',       color:'#15803d', bg:'#f0fdf4', border:'#86efac' },
  'V1.1':    { label:'Pessimiste', color:'#b45309', bg:'#fffbeb', border:'#fcd34d' },
  'Pipeline':{ label:'Pipeline',   color:'#4b5563', bg:'#f9fafb', border:'#d1d5db' },
}

function versionMeta(nom: string) {
  for (const key of Object.keys(VERSION_META)) {
    if (nom.startsWith(key)) return VERSION_META[key]
  }
  return { label: nom, color:'#4b5563', bg:'#f9fafb', border:'#d1d5db' }
}

interface Projet {
  id: string
  wbs_code: string
  nom: string
  type?: string
  statut: string
  classification_vente?: string
  project_country?: string
  owner?: string
  q1?: boolean
  q2?: boolean
  q3?: boolean
  q4?: boolean
  date_last_update?: string
  annee?: number
}

interface Consultant { id: number; code: string; nom_complet: string }
interface Version    { id: number; nom: string; annee: number; est_actuelle: boolean }
interface Affectation {
  id: number; consultant_id: number; projet_id: number; version_id: number
  heures_jan: number; heures_fev: number; heures_mar: number; heures_avr: number
  heures_mai: number; heures_jun: number; heures_jul: number; heures_aou: number
  heures_sep: number; heures_oct: number; heures_nov: number; heures_dec: number
}

interface FormData {
  wbs_code: string
  nom: string
  type: string
  statut: string
  classification_vente: string
  project_country: string
  owner: string
  q1: boolean
  q2: boolean
  q3: boolean
  q4: boolean
}

const EMPTY_FORM: FormData = {
  wbs_code: '', nom: '',
  type: 'IMPLEMENTATION', statut: 'PIPELINE',
  classification_vente: 'SERVICES',
  project_country: 'Tunisia', owner: '',
  q1: false, q2: false, q3: false, q4: false,
}

const STATUT_COLORS: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600',
  PIPELINE:    'bg-amber-500/10 text-amber-600',
  COMPLETED:   'bg-emerald-500/10 text-emerald-600',
  ON_HOLD:     'bg-slate-500/10 text-slate-600',
}

const TYPE_COLORS: Record<string, string> = {
  IMPLEMENTATION: 'bg-violet-500/10 text-violet-600',
  AMS:            'bg-teal-500/10 text-teal-600',
  PRESALES:       'bg-orange-500/10 text-orange-600',
  ROLLOUT:        'bg-cyan-500/10 text-cyan-600',
  SUPPORT:        'bg-rose-500/10 text-rose-600',
}

// ─── Composants réutilisables ──────────────────────────────────

const Field = ({ name, label, placeholder = '', type = 'text', required = false, value, onChange }: {
  name: string, label: string, placeholder?: string, type?: string,
  required?: boolean, value: string | number,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input name={name} value={value} onChange={onChange} type={type}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
)

const SelectField = ({ name, label, options, required = false, value, onChange }: {
  name: string, label: string, options: {value: string, label: string}[],
  required?: boolean, value: string,
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <select name={name} value={value} onChange={onChange}
      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)

const SectionTitle = ({ title }: { title: string }) => (
  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b border-border">
    {title}
  </p>
)

function QuarterBadge({ active, label }: { active?: boolean, label: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${
      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
    }`}>{label}</span>
  )
}

// ─── Version card selector ─────────────────────────────────────
function VersionCards({ versions, selected, onChange }: {
  versions: Version[]; selected: number | null; onChange: (id: number) => void
}) {
  if (!versions.length) return null
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {versions.map(v => {
        const meta   = versionMeta(v.nom)
        const active = selected === v.id
        return (
          <button key={v.id} type="button" onClick={() => onChange(v.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'flex-start',
            padding:'10px 14px', borderRadius:10, cursor:'pointer',
            border:`2px solid ${active ? meta.color : meta.border}`,
            background: active ? meta.bg : '#fff',
            boxShadow: active ? `0 0 0 3px ${meta.color}22` : 'none',
            transition:'all .15s', minWidth:90,
          }}>
            <span style={{ fontSize:13, fontWeight:700, color: active ? meta.color : '#374151' }}>{v.nom}</span>
            <span style={{
              marginTop:4, fontSize:10, fontWeight:700, letterSpacing:'.05em',
              textTransform:'uppercase', padding:'2px 7px', borderRadius:4,
              background: active ? meta.color : meta.border,
              color: active ? '#fff' : meta.color,
            }}>{meta.label}</span>
            {v.est_actuelle && <span style={{ marginTop:4, fontSize:9, color: meta.color, fontWeight:600 }}>actuelle</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── Grille heures par mois ────────────────────────────────────
function AssignHoursGrid({ hours, setHours }: { hours: Record<string,string>; setHours: (h: Record<string,string>) => void }) {
  const totalH = MOIS_KEYS.reduce((s, k) => s + (Number(hours[k]) || 0), 0)
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <label style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Heures par mois</label>
        <span style={{ fontSize:12, fontWeight:700, color:'#2563eb', background:'#eff6ff', padding:'2px 8px', borderRadius:5 }}>
          Total : {totalH}h · {Math.round(totalH / 12 / 160 * 100)}% moy.
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8 }}>
        {MOIS_LABELS.map((label, i) => {
          const key = MOIS_KEYS[i]
          const h   = Number(hours[key]) || 0
          const pct = Math.round(h / 160 * 100)
          return (
            <div key={key} style={{
              background: h > 0 ? (pct > 100 ? '#fff5f5' : pct >= 80 ? '#fffbeb' : '#f0fdf4') : '#f9fafb',
              border:`1px solid ${h > 0 ? (pct > 100 ? '#fca5a5' : pct >= 80 ? '#fcd34d' : '#86efac') : '#e5e7eb'}`,
              borderRadius:8, padding:'8px 10px',
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#6b7280', marginBottom:4, textTransform:'uppercase' }}>{label}</div>
              <input type="number" min="0" max="240" step="0.1" value={hours[key]}
                onChange={e => setHours({ ...hours, [key]: e.target.value })}
                placeholder="0"
                style={{ width:'100%', border:'none', background:'transparent', fontSize:14, fontWeight:700, color:'#111827', outline:'none' }}
              />
              {h > 0 && <div style={{ fontSize:9, color: pct > 100 ? '#ef4444' : pct >= 80 ? '#d97706' : '#16a34a', marginTop:2, fontWeight:600 }}>{pct}%</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Modal affectation consultants ─────────────────────────────

function AssignConsultantsModal({ projet, onClose }: { projet: Projet; onClose: () => void }) {
  const currentYear = new Date().getFullYear()

  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [consultants,  setConsultants]  = useState<Consultant[]>([])
  const [allVersions,  setAllVersions]  = useState<Version[]>([])
  const [yearVersions, setYearVersions] = useState<Version[]>([])
  const [loadingData,  setLoadingData]  = useState(true)
  const [consultantId, setConsultantId] = useState('')
  const [versionId,    setVersionId]    = useState<number|null>(null)
  const [annee,        setAnnee]        = useState(currentYear)
  const [hours,        setHours]        = useState<Record<string,string>>(EMPTY_HOURS)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const fetchYearVersions = (y: number) => {
    api.get(`/planning/versions?annee=${y}`)
      .then(r => {
        const vlist: Version[] = r.data
        setYearVersions(vlist)
        const def = vlist.find(v => v.est_actuelle) ?? vlist[0]
        setVersionId(def?.id ?? null)
      }).catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      api.get(`/planning/?projet_id=${projet.id}`),
      api.get('/consultants'),
      api.get('/planning/versions'),
    ]).then(([aff, cons, vers]) => {
      setAffectations(aff.data)
      setConsultants(cons.data)
      setAllVersions(vers.data)
    }).catch(() => {}).finally(() => setLoadingData(false))
    fetchYearVersions(currentYear)
  }, [])

  function handleYearChange(y: number) {
    setAnnee(y)
    setVersionId(null)
    fetchYearVersions(y)
  }

  const consultantLabel = (id: number) => {
    const c = consultants.find(c => c.id === id)
    return c ? `[${c.code}] ${c.nom_complet}` : `#${id}`
  }

  const totalH = (aff: Affectation) =>
    MOIS_KEYS.reduce((s, k) => s + (((aff as unknown) as Record<string,number>)[`heures_${k}`] || 0), 0)

  const handleDelete = async (affId: number) => {
    try {
      await api.delete(`/planning/${affId}`)
      setAffectations(prev => prev.filter(a => a.id !== affId))
    } catch {}
  }

  const handleAdd = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!consultantId || !versionId) { setError('Sélectionnez un consultant et une version.'); return }
    setSaving(true); setError('')
    try {
      const body: Record<string,number> = {
        consultant_id: Number(consultantId),
        projet_id: Number(projet.id),
        version_id: versionId,
      }
      MOIS_KEYS.forEach(k => { body[`heures_${k}`] = Number(hours[k]) || 0 })
      const r = await api.post('/planning/', body)
      setAffectations(prev => [...prev, r.data])
      setConsultantId('')
      setHours(EMPTY_HOURS)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Erreur lors de l'ajout.")
    } finally { setSaving(false) }
  }

  const labelStyle: React.CSSProperties = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }
  const selectStyle: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:9, fontSize:13, color:'#111827', background:'#fff', outline:'none', cursor:'pointer' }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:740, boxShadow:'0 32px 80px rgba(0,0,0,.25)', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.5rem 1.75rem', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#111827' }}>Consultants affectés</div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:1 }}>{projet.nom} · {projet.wbs_code}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:4, borderRadius:6, display:'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY:'auto', padding:'1.5rem 1.75rem', flex:1 }}>

          {/* Existing assignments */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              Affectations existantes
              <span style={{ background:'#eff6ff', color:'#2563eb', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4 }}>
                {affectations.length}
              </span>
            </div>
            {loadingData ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:'12px 0' }}>Chargement...</div>
            ) : affectations.length === 0 ? (
              <div style={{ fontSize:13, color:'#9ca3af', padding:'12px 0', fontStyle:'italic' }}>
                Aucun consultant affecté a ce projet.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {affectations.map(aff => {
                  const v = allVersions.find(v => v.id === aff.version_id)
                  const meta = versionMeta(v?.nom ?? '')
                  const total = totalH(aff)
                  return (
                    <div key={aff.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f8faff', border:'1px solid #e0eaff', borderRadius:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1e3a6e' }}>
                          {consultantLabel(aff.consultant_id)}
                        </span>
                        {v && (
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:meta.bg, color:meta.color, border:`1px solid ${meta.border}`, textTransform:'uppercase', letterSpacing:'.04em' }}>
                            {v.nom} {v.annee} · {meta.label}
                          </span>
                        )}
                        <span style={{ fontSize:12, color:'#6b7280' }}>{total}h · {Math.round(total / 12 / 160 * 100)}% moy.</span>
                      </div>
                      <button onClick={() => handleDelete(aff.id)}
                        title="Retirer l'affectation"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:7, background:'#fef2f2', border:'1px solid #fca5a5', color:'#ef4444', cursor:'pointer', flexShrink:0 }}>
                        <X size={13}/>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add form */}
          <div style={{ borderTop:'2px solid #f1f5f9', paddingTop:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:16 }}>Ajouter un consultant</div>
            <form onSubmit={handleAdd}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                <div>
                  <label style={labelStyle}>Consultant *</label>
                  <select value={consultantId} onChange={e => setConsultantId(e.target.value)} required style={selectStyle}>
                    <option value="">Choisir…</option>
                    {consultants.map(c => <option key={c.id} value={c.id}>[{c.code}] {c.nom_complet}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Remplissage rapide</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {[40,80,120,160].map(h => (
                      <button key={h} type="button"
                        onClick={() => setHours(Object.fromEntries(MOIS_KEYS.map(k => [k, String(h)])))}
                        style={{ flex:1, padding:'8px 4px', borderRadius:7, fontSize:12, fontWeight:600, background:'#f1f5f9', color:'#374151', border:'1px solid #e5e7eb', cursor:'pointer' }}>
                        {h}h
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setHours(EMPTY_HOURS)}
                      style={{ flex:1, padding:'8px 4px', borderRadius:7, fontSize:12, fontWeight:600, background:'#fef2f2', color:'#ef4444', border:'1px solid #fca5a5', cursor:'pointer' }}>
                      Eff.
                    </button>
                  </div>
                </div>
              </div>

              {/* Année */}
              <div style={{ marginBottom:14 }}>
                <label style={labelStyle}>Année *</label>
                <YearPicker value={annee} onChange={handleYearChange} />
              </div>

              {/* Version */}
              <div style={{ marginBottom:16 }}>
                <label style={labelStyle}>Version *</label>
                <VersionCards versions={yearVersions} selected={versionId} onChange={setVersionId} />
              </div>

              <AssignHoursGrid hours={hours} setHours={setHours} />

              {error && (
                <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#dc2626', display:'flex', gap:8, alignItems:'center' }}>
                  <X size={14}/> {error}
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8 }}>
                <button type="submit" disabled={saving} style={{
                  padding:'10px 24px', borderRadius:9, fontSize:14, fontWeight:600,
                  background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'#fff',
                  border:'none', cursor:saving?'not-allowed':'pointer', opacity:saving?.7:1,
                  display:'flex', alignItems:'center', gap:8,
                  boxShadow:'0 4px 14px rgba(37,99,235,.4)',
                }}>
                  {saving ? 'Ajout...' : <><Plus size={15}/> Affecter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Projet ──────────────────────────────────────────────
function ProjetModal({ initial, editId, onClose, onSaved }: {
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
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.wbs_code) return setError('Le code WBS est obligatoire')
    if (!form.nom) return setError('Le nom du projet est obligatoire')
    if (!form.project_country) return setError('Le pays est obligatoire')

    setLoading(true)
    setError('')
    try {
      if (isEdit) {
        await api.put(`/projets/${editId}`, form)
      } else {
        await api.post('/projets', form)
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-base font-semibold">
              {isEdit ? '✏️ Modifier projet' : '➕ Nouveau projet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Champs avec <span className="text-rose-500">*</span> sont obligatoires
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">

          {/* Section 1 — Identification */}
          <div className="space-y-4">
            <SectionTitle title="📋 Identification" />
            <div className="grid grid-cols-2 gap-4">
              <Field name="wbs_code" label="Code WBS / ID" placeholder="ex: Projet 1" required value={form.wbs_code} onChange={handleChange} />
              <Field name="nom" label="Nom du projet" placeholder="ex: Ariba Implementation" required value={form.nom} onChange={handleChange} />
            </div>
          </div>

          {/* Section 2 — Classification */}
          <div className="space-y-4">
            <SectionTitle title="🏷️ Classification" />
            <div className="grid grid-cols-2 gap-4">
              <SelectField name="type" label="Type" required value={form.type} onChange={handleChange}
                options={[
                  { value: 'IMPLEMENTATION', label: 'Implementation' },
                  { value: 'AMS', label: 'AMS' },
                  { value: 'PRESALES', label: 'Presales' },
                  { value: 'ROLLOUT', label: 'Rollout' },
                  { value: 'SUPPORT', label: 'Support' },
                ]}
              />
              <SelectField name="statut" label="Statut" required value={form.statut} onChange={handleChange}
                options={[
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'PIPELINE', label: 'Pipeline' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'ON_HOLD', label: 'On Hold' },
                ]}
              />
              <SelectField name="classification_vente" label="Sales Classification" value={form.classification_vente} onChange={handleChange}
                options={[
                  { value: 'LOB', label: 'LoB' },
                  { value: 'SERVICES', label: 'Services' },
                  { value: 'AMS', label: 'AMS' },
                  { value: 'GROW', label: 'GROW' },
                  { value: 'RISE', label: 'RISE' },
                ]}
              />
            </div>
          </div>

          {/* Section 3 — Localisation */}
          <div className="space-y-4">
            <SectionTitle title="📍 Localisation & Owner" />
            <div className="grid grid-cols-2 gap-4">
              <SelectField name="project_country" label="Project Country" required value={form.project_country} onChange={handleChange}
                options={[
                  { value: 'Tunisia', label: 'Tunisia' },
                  { value: 'Morocco', label: 'Morocco' },
                  { value: 'Botswana', label: 'Botswana' },
                  { value: 'Mauritania', label: 'Mauritania' },
                  { value: 'Ivory Coast', label: 'Ivory Coast' },
                  { value: 'Kenya', label: 'Kenya' },
                  { value: 'South Africa', label: 'South Africa' },
                  { value: 'Ethiopia', label: 'Ethiopia' },
                ]}
              />
              <Field name="owner" label="Owner of Project" placeholder="ex: Morocco" value={form.owner} onChange={handleChange} />
            </div>
          </div>

          {/* Section 4 — Quarters */}
          <div className="space-y-4">
            <SectionTitle title="📅 Trimestres actifs" />
            <div className="flex gap-6">
              {(['q1','q2','q3','q4'] as const).map(q => (
                <label key={q} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={form[q]}
                    onChange={e => setForm({ ...form, [q]: e.target.checked })}
                    className="w-4 h-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm font-medium uppercase">{q}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-card px-5 py-4 flex flex-col gap-3">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose}
              style={{ padding:'9px 20px', borderRadius:100, fontSize:13, fontWeight:500, background:'#F5F6F8', color:'#5A6472', border:'1px solid #E0E4E8', cursor:'pointer' }}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding:'9px 22px', borderRadius:100, fontSize:13, fontWeight:700, background:'#162B6E', color:'#fff', border:'none', cursor:loading?'not-allowed':'pointer', opacity:loading?0.65:1, boxShadow:'0 4px 14px rgba(22,43,110,.25)', transition:'all .18s' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background='#1E3A8A' }}
              onMouseLeave={e => { e.currentTarget.style.background='#162B6E' }}>
              {loading ? 'Sauvegarde...' : isEdit ? 'Enregistrer' : 'Créer projet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Suppression ─────────────────────────────────────────
function DeleteModal({ projet, onClose, onDeleted }: {
  projet: Projet
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await api.delete(`/projets/${projet.id}`)
      onDeleted()
      onClose()
    } catch { onClose() }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2 rounded-lg"><Trash2 size={18} className="text-rose-500" /></div>
          <h3 className="text-base font-semibold">Supprimer projet</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Tu vas supprimer <strong>{projet.nom} ({projet.wbs_code})</strong>. Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            style={{ padding:'9px 20px', borderRadius:100, fontSize:13, fontWeight:500, background:'#F5F6F8', color:'#5A6472', border:'1px solid #E0E4E8', cursor:'pointer' }}>
            Annuler
          </button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding:'9px 22px', borderRadius:100, fontSize:13, fontWeight:700, background:'#dc2626', color:'#fff', border:'none', cursor:loading?'not-allowed':'pointer', opacity:loading?0.65:1, boxShadow:'0 4px 14px rgba(220,38,38,.25)', transition:'all .18s' }}>
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────
export default function ProjetsPage() {
  const t = useT().projets
  const tc = useT().common
  const [projets, setProjets]               = useState<Projet[]>([])
  const [search, setSearch]                 = useState('')
  const [filterStatut, setFilterStatut]     = useState('ALL')
  const [filterType, setFilterType]         = useState('ALL')
  const [loading, setLoading]               = useState(true)
  const [showCreate, setShowCreate]         = useState(false)
  const [editProjet, setEditProjet]         = useState<Projet | null>(null)
  const [deleteProjet, setDeleteProjet]     = useState<Projet | null>(null)
  const [assignProjet, setAssignProjet]     = useState<Projet | null>(null)

  const fetchProjets = () => {
    setLoading(true)
    api.get('/projets')
      .then(r => setProjets(r.data))
      .catch(err => console.error('API error:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProjets() }, [])

  const filtered = projets.filter(p => {
    const matchSearch =
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.wbs_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.project_country || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.owner || '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'ALL' || p.statut === filterStatut
    const matchType   = filterType === 'ALL' || p.type === filterType
    return matchSearch && matchStatut && matchType
  })

  const toFormData = (p: Projet): FormData => ({
    wbs_code: p.wbs_code,
    nom: p.nom,
    type: p.type || 'IMPLEMENTATION',
    statut: p.statut,
    classification_vente: p.classification_vente || 'SERVICES',
    project_country: p.project_country || 'Tunisia',
    owner: p.owner || '',
    q1: p.q1 || false,
    q2: p.q2 || false,
    q3: p.q3 || false,
    q4: p.q4 || false,
  })

  // Stats rapides
  const nbInProgress = projets.filter(p => p.statut === 'IN_PROGRESS').length
  const nbPipeline   = projets.filter(p => p.statut === 'PIPELINE').length
  const nbCompleted  = projets.filter(p => p.statut === 'COMPLETED').length

  return (
    <div className="space-y-5">

      {showCreate && <ProjetModal onClose={() => setShowCreate(false)} onSaved={fetchProjets} />}
      {editProjet && (
        <ProjetModal editId={editProjet.id} initial={toFormData(editProjet)}
          onClose={() => setEditProjet(null)} onSaved={fetchProjets} />
      )}
      {deleteProjet && (
        <DeleteModal projet={deleteProjet}
          onClose={() => setDeleteProjet(null)} onDeleted={fetchProjets} />
      )}
      {assignProjet && (
        <AssignConsultantsModal projet={assignProjet} onClose={() => setAssignProjet(null)} />
      )}

      {/* Header — SEIDOR style */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 rounded-full bg-primary" />
          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{t.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{projets.length} projets · SAP Africa</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:100, background:'#162B6E', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, boxShadow:'0 4px 16px rgba(22,43,110,.25)', transition:'all .18s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1E3A8A')}
          onMouseLeave={e => (e.currentTarget.style.background = '#162B6E')}
        >
          <Plus size={15} /> {t.addBtn}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: tc.total,              value: projets.length,  color: 'bg-card border border-border' },
          { label: t.statuses.inProgress, value: nbInProgress,    color: 'bg-emerald-500/10 border border-emerald-500/20' },
          { label: t.statuses.pipeline,   value: nbPipeline,      color: 'bg-blue-500/10 border border-blue-500/20' },
          { label: t.statuses.done,       value: nbCompleted,     color: 'bg-purple-500/10 border border-purple-500/20' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4`}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Statut */}
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-md text-sm">
          <option value="ALL">Tous statuts</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PIPELINE">Pipeline</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
        </select>

        {/* Type */}
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-md text-sm">
          <option value="ALL">Tous types</option>
          <option value="IMPLEMENTATION">Implementation</option>
          <option value="AMS">AMS</option>
          <option value="PRESALES">Presales</option>
          <option value="ROLLOUT">Rollout</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Code</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Projet</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Pays</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Classification</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Owner</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-3 py-3">Q1</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-3 py-3">Q2</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-3 py-3">Q3</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-3 py-3">Q4</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Statut</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Last Update</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={13} className="text-center py-8 text-sm text-muted-foreground">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-8 text-sm text-muted-foreground">Aucun projet trouvé</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3"><span className="font-mono text-xs">{p.wbs_code}</span></td>
                  <td className="px-3 py-3 text-sm max-w-48 truncate" title={p.nom}>{p.nom}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{p.project_country || '—'}</td>
                  <td className="px-3 py-3">
                    {p.type
                      ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[p.type] ?? ''}`}>{p.type}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{p.classification_vente || '—'}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{p.owner || '—'}</td>
                  <td className="px-3 py-3 text-center"><QuarterBadge active={p.q1} label="Q1"/></td>
                  <td className="px-3 py-3 text-center"><QuarterBadge active={p.q2} label="Q2"/></td>
                  <td className="px-3 py-3 text-center"><QuarterBadge active={p.q3} label="Q3"/></td>
                  <td className="px-3 py-3 text-center"><QuarterBadge active={p.q4} label="Q4"/></td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[p.statut] ?? ''}`}>
                      {p.statut.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {p.date_last_update ? p.date_last_update.toString().slice(0, 10) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setAssignProjet(p)}
                        className="p-1.5 rounded hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors" title="Gérer les consultants">
                        <Users size={14} />
                      </button>
                      <button onClick={() => setEditProjet(p)}
                        className="p-1.5 rounded hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors" title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteProjet(p)}
                        className="p-1.5 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}