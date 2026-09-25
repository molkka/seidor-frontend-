import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown, Save, Clock,
  CalendarDays, AlertTriangle, RefreshCw, Plus, Trash2,
} from 'lucide-react'
import { api } from '@/services/api'
import { useT } from '@/hooks/useT'
import { YearPicker } from '@/components/year-picker'
import { usePlanningYearStore } from '@/store/planningYearStore'

// ── Types ──────────────────────────────────────────────────────
interface Semaine {
  id: number
  annee: number
  iso_week: number
  heures_dispo: number
  date_debut: string | null
  date_fin: string | null
  mois: number
}

interface SemainesData {
  annee: number
  semaines: Semaine[]
  total_annuel: number
  nb_semaines: number
  nb_reduites: number
}

interface JourFerie {
  id: number
  annee: number
  nom: string
  date_ferie: string | null
  nb_jours: number
  is_lunar: boolean
  is_custom: boolean
}

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const MOIS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color = '#162255' }: {
  icon: React.ElementType
  value: string | number
  label: string
  color?: string
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px', padding: '20px 24px',
      boxShadow: '0 2px 12px rgba(22,34,85,0.06)',
      display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: '22px', color: '#162255', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#9aa3b8', marginTop: '3px' }}>{label}</div>
      </div>
    </div>
  )
}

// ── Grille mensuelle ──────────────────────────────────────────
function MonthGrid({ semaines }: { semaines: Semaine[] }) {
  const months = useT().months.short
  const totals: number[] = Array(12).fill(0)
  semaines.forEach(s => {
    if (s.mois >= 1 && s.mois <= 12) totals[s.mois - 1] += s.heures_dispo
  })

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
    }}>
      {totals.map((h, i) => {
        const pct = Math.round((h / 176) * 100)
        const color = h === 0 ? '#e5e7eb' : h < 120 ? '#fbbf24' : h <= 168 ? '#22c55e' : '#162255'
        return (
          <div key={i} style={{
            background: '#f8faff', borderRadius: '12px',
            padding: '12px 14px', border: '1px solid #eaeffb',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {months[i]}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color, marginTop: '4px', lineHeight: 1 }}>
              {Math.round(h)}h
            </div>
            <div style={{ marginTop: '6px', background: '#e5e7eb', borderRadius: '4px', height: '4px' }}>
              <div style={{ width: `${Math.min(pct, 100)}%`, height: '4px', borderRadius: '4px', background: color, transition: 'width .3s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Ligne férié ────────────────────────────────────────────────
function FerieRow({ ferie, onChange, onDelete }: {
  ferie: JourFerie
  onChange: (id: number, date: string | null, nb: number) => void
  onDelete?: (id: number) => void
}) {
  const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
    fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
    background: bg, color, letterSpacing: '.04em', textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderRadius: '10px',
      background: ferie.is_custom ? '#f0f9ff' : '#f8faff',
      border: `1px solid ${ferie.is_custom ? '#bae6fd' : '#eaeffb'}`,
      marginBottom: '8px', flexWrap: 'wrap',
    }}>
      {/* Nom */}
      <div style={{ flex: 1, minWidth: '140px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#162255' }}>{ferie.nom}</div>
        {ferie.date_ferie && !ferie.is_lunar && !ferie.is_custom && (
          <div style={{ fontSize: '11px', color: '#9aa3b8', marginTop: '1px' }}>
            {formatDate(ferie.date_ferie)}
          </div>
        )}
      </div>

      {/* Badge type */}
      {ferie.is_custom ? (
        <span style={badgeStyle('#e0f2fe', '#0369a1')}>Custom</span>
      ) : ferie.is_lunar ? (
        <span style={badgeStyle('#fef3c7', '#92400e')}>Lunaire</span>
      ) : (
        <span style={badgeStyle('#dcfce7', '#15803d')}>Officiel</span>
      )}

      {/* Date input pour lunaires et customs */}
      {(ferie.is_lunar || ferie.is_custom) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <input
            type="date"
            value={ferie.date_ferie ?? ''}
            onChange={e => onChange(ferie.id, e.target.value || null, ferie.nb_jours)}
            style={{
              padding: '5px 8px', border: `1px solid ${ferie.is_lunar && ferie.date_ferie ? '#fcd34d' : '#d1d5db'}`,
              borderRadius: '8px', fontSize: '12px', color: '#374151',
              outline: 'none', background: ferie.is_lunar && ferie.date_ferie ? '#fffbeb' : '#fff',
            }}
          />
          {ferie.is_lunar && ferie.date_ferie && (
            <span style={{ fontSize: '10px', color: '#b45309', textAlign: 'center' }}>
              approx. — à confirmer
            </span>
          )}
          {ferie.is_lunar && !ferie.date_ferie && (
            <span style={{ fontSize: '10px', color: '#9aa3b8', textAlign: 'center' }}>
              date à saisir
            </span>
          )}
        </div>
      )}

      {/* Nombre de jours */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#9aa3b8', whiteSpace: 'nowrap' }}>Jours :</span>
        <input
          type="number" min={0} max={10} value={ferie.nb_jours}
          onChange={e => onChange(ferie.id, ferie.date_ferie, Math.max(0, parseInt(e.target.value) ?? 0))}
          style={{
            width: '48px', height: '32px', borderRadius: '8px',
            border: '1.5px solid #d1d5db', background: '#fff',
            textAlign: 'center', fontWeight: 700, fontSize: '14px',
            color: ferie.nb_jours === 0 ? '#9aa3b8' : '#162255', outline: 'none',
          }}
        />
      </div>

      {/* Supprimer (custom uniquement) */}
      {ferie.is_custom && onDelete && (
        <button
          onClick={() => onDelete(ferie.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#ef4444', display: 'flex', alignItems: 'center', padding: '4px',
          }}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

// ── Accordéon mois ────────────────────────────────────────────
function WeekAccordion({ moisIndex, semaines, onChange }: {
  moisIndex: number
  semaines: Semaine[]
  onChange: (id: number, val: number) => void
}) {
  const [open, setOpen] = useState(false)
  const months = useT().months.long
  const total = semaines.reduce((s, w) => s + w.heures_dispo, 0)
  const nbReduites = semaines.filter(w => w.heures_dispo < 40).length

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', border: '1px solid #eaeffb',
      overflow: 'hidden', marginBottom: '8px',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          padding: '12px 16px', background: 'transparent',
          border: 'none', cursor: 'pointer', gap: '10px',
        }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#162255', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 800, fontSize: '11px', color: '#fff' }}>
            {String(moisIndex + 1).padStart(2, '0')}
          </span>
        </div>

        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#162255' }}>{months[moisIndex]}</div>
          <div style={{ fontSize: '11px', color: '#9aa3b8', marginTop: '1px' }}>
            {semaines.length} semaine{semaines.length > 1 ? 's' : ''}
            {nbReduites > 0 && ` · ${nbReduites} réduite${nbReduites > 1 ? 's' : ''}`}
          </div>
        </div>

        <div style={{
          background: '#f0f4ff', borderRadius: '8px',
          padding: '3px 10px', fontWeight: 700, fontSize: '13px', color: '#162255',
        }}>
          {Math.round(total)}h
        </div>
        <ChevronDown
          size={16} color="#9aa3b8"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>

      {open && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ height: '1px', background: '#eaeffb', marginBottom: '10px' }} />
          {semaines.map(s => {
            const reduced = s.heures_dispo < 40
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: '8px',
                background: reduced ? '#fff8ed' : '#f8faff',
                border: `1px solid ${reduced ? '#ffd080' : '#eaeffb'}`,
                marginBottom: '6px',
              }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '6px',
                  background: reduced ? '#ffd08022' : '#162255',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: reduced ? '#b07800' : '#fff' }}>
                    W{s.iso_week}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#162255' }}>Semaine {s.iso_week}</div>
                  <div style={{ fontSize: '10px', color: '#9aa3b8' }}>
                    {formatDate(s.date_debut)} – {formatDate(s.date_fin)}
                  </div>
                </div>
                <input
                  type="number" min={0} max={40} step={4}
                  value={s.heures_dispo}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v >= 0 && v <= 40) onChange(s.id, v)
                  }}
                  style={{
                    width: '56px', height: '32px', borderRadius: '8px',
                    border: `1.5px solid ${reduced ? '#ffd080' : '#dde3ee'}`,
                    background: '#fff', textAlign: 'center',
                    fontWeight: 700, fontSize: '13px', color: reduced ? '#b07800' : '#162255',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#9aa3b8' }}>h</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────
export default function ImputationPage() {
  const { selectedYear, setSelectedYear } = usePlanningYearStore()
  const t = useT().imputation
  const tc = useT().common
  const [annee, setAnnee]             = useState(selectedYear ?? new Date().getFullYear())
  const [data, setData]               = useState<SemainesData | null>(null)
  const [feries, setFeries]           = useState<JourFerie[]>([])
  const [dirty, setDirty]             = useState<Record<number, number>>({})
  const [feriesDirty, setFeriesDirty] = useState<Record<number, { date: string | null; nb: number }>>({})
  const [saving, setSaving]           = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [showWeeks, setShowWeeks]     = useState(false)
  const [newNom, setNewNom]           = useState('')
  const [newDate, setNewDate]         = useState('')
  const [newNb, setNewNb]             = useState(1)
  const [addingCustom, setAddingCustom] = useState(false)

  const load = useCallback(async (yr: number) => {
    setLoading(true)
    setDirty({})
    setFeriesDirty({})
    try {
      const [semRes, ferRes] = await Promise.all([
        api.get(`/imputation/semaines?annee=${yr}`),
        api.get(`/imputation/feries?annee=${yr}`),
      ])
      setData(semRes.data)
      setFeries(ferRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(annee) }, [annee, load])

  function handleWeekChange(id: number, val: number) {
    setDirty(prev => ({ ...prev, [id]: val }))
    setData(prev => {
      if (!prev) return prev
      return { ...prev, semaines: prev.semaines.map(s => s.id === id ? { ...s, heures_dispo: val } : s) }
    })
  }

  function handleFerieChange(id: number, date: string | null, nb: number) {
    setFeriesDirty(prev => ({ ...prev, [id]: { date, nb } }))
    setFeries(prev => prev.map(f => f.id === id ? { ...f, date_ferie: date, nb_jours: nb } : f))
  }

  async function handleDeleteFerie(id: number) {
    await api.delete(`/imputation/feries/${id}`)
    setFeries(prev => prev.filter(f => f.id !== id))
    const next = { ...feriesDirty }
    delete next[id]
    setFeriesDirty(next)
  }

  async function handleAddCustom() {
    if (!newNom.trim()) return
    const res = await api.post(`/imputation/feries?annee=${annee}`, {
      nom: newNom.trim(),
      date_ferie: newDate || null,
      nb_jours: newNb,
    })
    setFeries(prev => [...prev, res.data])
    setNewNom('')
    setNewDate('')
    setNewNb(1)
    setAddingCustom(false)
  }

  async function handleCalculer() {
    // Sauvegarder les fériés modifiés d'abord
    const ferUpdates = Object.entries(feriesDirty).map(([id, v]) => ({
      id: Number(id), date_ferie: v.date || null, nb_jours: v.nb,
    }))
    if (ferUpdates.length > 0) {
      await api.put('/imputation/feries', ferUpdates)
      setFeriesDirty({})
    }

    setCalculating(true)
    try {
      await api.post(`/imputation/calculer-semaines?annee=${annee}`)
      const res = await api.get(`/imputation/semaines?annee=${annee}`)
      setData(res.data)
      setDirty({})
    } finally {
      setCalculating(false)
    }
  }

  async function handleSave() {
    const updates = Object.entries(dirty).map(([id, heures_dispo]) => ({
      id: Number(id), heures_dispo,
    }))
    const ferUpdates = Object.entries(feriesDirty).map(([id, v]) => ({
      id: Number(id), date_ferie: v.date || null, nb_jours: v.nb,
    }))

    if (!updates.length && !ferUpdates.length) return
    setSaving(true)
    try {
      await Promise.all([
        updates.length   ? api.put('/imputation/semaines', updates)  : Promise.resolve(),
        ferUpdates.length ? api.put('/imputation/feries', ferUpdates) : Promise.resolve(),
      ])
      setDirty({})
      setFeriesDirty({})
      await load(annee)
    } finally {
      setSaving(false)
    }
  }

  const byMonth: Semaine[][] = Array.from({ length: 12 }, () => [])
  data?.semaines.forEach(s => {
    if (s.mois >= 1 && s.mois <= 12) byMonth[s.mois - 1].push(s)
  })

  const nbDirty    = Object.keys(dirty).length + Object.keys(feriesDirty).length
  const totalAnnuel = data?.total_annuel ?? 0
  const joursTotal  = Math.round(totalAnnuel / 8)

  const feriesFixes   = feries.filter(f => !f.is_lunar && !f.is_custom)
  const feriesLunaires = feries.filter(f => f.is_lunar)
  const feriesCustoms  = feries.filter(f => f.is_custom)

  return (
    <div style={{ margin: '-1rem', background: '#f0f2f8', minHeight: 'calc(100vh - 3.5rem)', padding: '32px 40px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '26px', color: '#162255', margin: 0 }}>
            {t.title} {annee}
          </h1>
          <p style={{ fontSize: '13px', color: '#9aa3b8', margin: '4px 0 0' }}>
            Configurez les jours fériés — les heures disponibles se recalculent automatiquement.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sélecteur d'année */}
          <YearPicker value={annee} onChange={y => { setAnnee(y); setSelectedYear(y) }} />

          <button
            onClick={handleSave}
            disabled={nbDirty === 0 || saving}
            style={{
              background: nbDirty > 0 ? '#162255' : '#9aa3b8',
              color: '#fff', borderRadius: '10px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', border: 'none', cursor: nbDirty > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
            }}
          >
            <Save size={15} />
            {saving ? tc.saving : nbDirty > 0 ? `${tc.save} (${nbDirty})` : tc.save}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={Clock}         value={`${Math.round(totalAnnuel)}h`} label="Total heures annuelles" />
        <StatCard icon={CalendarDays}  value={`${joursTotal} j`}              label="Jours ouvrables estimés"    color="#4096f7" />
        <StatCard icon={AlertTriangle} value={data?.nb_reduites ?? 0}          label="Semaines réduites (< 40h)"  color="#f59e0b" />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9aa3b8', fontSize: '14px' }}>
          Chargement...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px', alignItems: 'start' }}>

          {/* ── Panneau jours fériés ── */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #eaeffb', padding: '20px', boxShadow: '0 1px 8px rgba(22,34,85,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontWeight: 800, fontSize: '15px', color: '#162255', margin: 0 }}>
                {t.holidays} {annee}
              </h2>
              <button
                onClick={handleCalculer}
                disabled={calculating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#162255', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '7px 12px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 700,
                }}
              >
                <RefreshCw size={13} style={{ animation: calculating ? 'spin 1s linear infinite' : 'none' }} />
                {calculating ? tc.loading : tc.refresh}
              </button>
            </div>

            {/* Fixes */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9aa3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
              Fériés officiels ({feriesFixes.length})
            </div>
            {feriesFixes.map(f => (
              <FerieRow key={f.id} ferie={f} onChange={handleFerieChange} />
            ))}

            {/* Lunaires */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9aa3b8', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 8px' }}>
              Fériés islamiques — saisir la date {annee}
            </div>
            {feriesLunaires.map(f => (
              <FerieRow key={f.id} ferie={f} onChange={handleFerieChange} />
            ))}

            {/* Customs */}
            {feriesCustoms.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9aa3b8', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 8px' }}>
                  Jours supplémentaires ({feriesCustoms.length})
                </div>
                {feriesCustoms.map(f => (
                  <FerieRow key={f.id} ferie={f} onChange={handleFerieChange} onDelete={handleDeleteFerie} />
                ))}
              </>
            )}

            {/* Formulaire ajout custom */}
            {addingCustom ? (
              <div style={{
                marginTop: '14px', padding: '12px', borderRadius: '10px',
                background: '#f0f9ff', border: '1px solid #bae6fd',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', marginBottom: '10px' }}>
                  Nouveau jour supplémentaire
                </div>
                <input
                  type="text" placeholder="Nom du jour"
                  value={newNom} onChange={e => setNewNom(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '13px', marginBottom: '8px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    style={{
                      flex: 1, padding: '7px 8px', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '12px', outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Jours :</span>
                    <input
                      type="number" min={0} max={10} value={newNb}
                      onChange={e => setNewNb(Math.max(0, parseInt(e.target.value) ?? 0))}
                      style={{
                        width: '48px', height: '34px', borderRadius: '8px',
                        border: '1px solid #d1d5db', textAlign: 'center',
                        fontWeight: 700, fontSize: '13px', outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleAddCustom}
                    style={{
                      flex: 1, background: '#162255', color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '8px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 700,
                    }}>
                    {tc.add}
                  </button>
                  <button onClick={() => setAddingCustom(false)}
                    style={{
                      flex: 1, background: '#f1f5f9', color: '#374151', border: 'none',
                      borderRadius: '8px', padding: '8px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 600,
                    }}>
                    {tc.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCustom(true)}
                style={{
                  width: '100%', marginTop: '14px', padding: '9px',
                  border: '1.5px dashed #d1d5db', borderRadius: '10px',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: 600, color: '#6b7280',
                }}
              >
                <Plus size={14} />
                {t.addHoliday}
              </button>
            )}
          </div>

          {/* ── Panneau droite : heures mensuelles + semaines ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Grille mensuelle */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #eaeffb', padding: '20px', boxShadow: '0 1px 8px rgba(22,34,85,0.04)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '15px', color: '#162255', margin: '0 0 14px' }}>
                {t.hours} / {t.period}
              </h2>
              {data && <MonthGrid semaines={data.semaines} />}
            </div>

            {/* Détail semaines (accordéons) */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #eaeffb', overflow: 'hidden', boxShadow: '0 1px 8px rgba(22,34,85,0.04)' }}>
              <button
                onClick={() => setShowWeeks(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'transparent', border: 'none',
                  cursor: 'pointer', gap: '8px',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#162255' }}>
                  Détail par semaine
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {data?.nb_reduites ? (
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                      borderRadius: '4px', background: '#fef3c7', color: '#92400e',
                    }}>
                      {data.nb_reduites} réduite{data.nb_reduites > 1 ? 's' : ''}
                    </span>
                  ) : null}
                  <ChevronDown
                    size={16} color="#9aa3b8"
                    style={{ transform: showWeeks ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                  />
                </div>
              </button>

              {showWeeks && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eaeffb' }}>
                  <div style={{ height: '12px' }} />
                  {byMonth.map((semaines, i) =>
                    semaines.length > 0 ? (
                      <WeekAccordion
                        key={i}
                        moisIndex={i}
                        semaines={semaines}
                        onChange={handleWeekChange}
                      />
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
