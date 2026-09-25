import React, { useEffect, useState } from 'react'
import { Download, RefreshCw, ChevronDown, ChevronRight, Plus, X, Pencil, Search, Calendar } from 'lucide-react'
import { api } from '@/services/api'
import { useT } from '@/hooks/useT'
import { YearPicker } from '@/components/year-picker'
import { usePlanningYearStore } from '@/store/planningYearStore'

const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const MOIS_KEYS   = ['jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec']

interface MoisCell  { heures: number; pct: number }
interface ProjetRow {
  projet_id: number; projet_nom: string; projet_code: string
  affectation_id: number; mois: Record<string, MoisCell>
  total_heures: number; taux_moyen: number
}
interface ConsultantRow {
  consultant_id: number; code: string; nom: string
  seniorite: string; division: string; projets: ProjetRow[]
  total_par_mois: Record<string, MoisCell>
  total_heures: number; taux_moyen: number; taux_max: number; surcharge: boolean
}
interface Version    { id: number; nom: string; annee: number; est_actuelle: boolean }
interface Consultant { id: number; code: string; nom_complet: string; statut?: string }
interface Projet {
  id: number; wbs_code: string; nom: string
  q1: boolean; q2: boolean; q3: boolean; q4: boolean; annee: number
}
interface EditTarget {
  affectation_id: number; consultant_id: number; projet_id: number
  nom: string; code: string; projet_nom: string; mois: Record<string, MoisCell>
  q1: boolean; q2: boolean; q3: boolean; q4: boolean
}

interface WeekRow    { iso_week: number; date_debut: string; date_fin: string; heures: number; heures_dispo?: number }
interface MonthWeeks { mois: number; mois_label: string; total_heures: number; semaines: WeekRow[] }

type DisplayMode = 'pct' | 'heures'

const EMPTY_HOURS = Object.fromEntries(MOIS_KEYS.map(k => [k, '']))

const QUARTER_MONTHS: Record<'q1'|'q2'|'q3'|'q4', string[]> = {
  q1: ['jan','fev','mar'], q2: ['avr','mai','jun'],
  q3: ['jul','aou','sep'], q4: ['oct','nov','dec'],
}
function getVisibleKeys(projet: Projet | null): string[] {
  if (!projet) return MOIS_KEYS
  const keys: string[] = []
  for (const q of ['q1','q2','q3','q4'] as const)
    if (projet[q]) keys.push(...QUARTER_MONTHS[q])
  return keys.length > 0 ? keys : MOIS_KEYS
}

function pctStyle(pct: number): React.CSSProperties {
  if (pct === 0)  return { background: 'transparent', color: '#c0c8d8' }
  if (pct > 100)  return { background: '#ffe4e4', color: '#c42b2b', fontWeight: 700 }
  if (pct >= 80)  return { background: '#fff4e0', color: '#b86000' }
  return             { background: '#e6f7ee', color: '#1a7a45' }
}

const labelStyle: React.CSSProperties = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }
const selectStyle: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:9, fontSize:13, color:'#111827', background:'#fff', outline:'none', cursor:'pointer' }

const VERSION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'V1.3':    { label:'Optimiste',   color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe' },
  'V1.2':    { label:'Reel',        color:'#15803d', bg:'#f0fdf4', border:'#86efac' },
  'V1.1':    { label:'Pessimiste',  color:'#b45309', bg:'#fffbeb', border:'#fcd34d' },
  'Pipeline':{ label:'Pipeline',    color:'#4b5563', bg:'#f9fafb', border:'#d1d5db' },
}

function versionMeta(nom: string) {
  for (const key of Object.keys(VERSION_META)) {
    if (nom.startsWith(key)) return VERSION_META[key]
  }
  return { label: nom, color:'#4b5563', bg:'#f9fafb', border:'#d1d5db' }
}

// ── Version card selector (top-level to avoid focus loss) ─────────────────────
function VersionCards({ versions, selected, onChange }: {
  versions: Version[]
  selected: number | null
  onChange: (id: number) => void
}) {
  if (!versions.length) return null
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {versions.map(v => {
        const meta    = versionMeta(v.nom)
        const active  = selected === v.id
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'flex-start',
              padding:'10px 14px', borderRadius:10, cursor:'pointer',
              border:`2px solid ${active ? meta.color : meta.border}`,
              background: active ? meta.bg : '#fff',
              boxShadow: active ? `0 0 0 3px ${meta.color}22` : 'none',
              transition:'all .15s', minWidth:90,
            }}
          >
            <span style={{ fontSize:13, fontWeight:700, color: active ? meta.color : '#374151' }}>{v.nom}</span>
            <span style={{
              marginTop:4, fontSize:10, fontWeight:700, letterSpacing:'.05em',
              textTransform:'uppercase', padding:'2px 7px', borderRadius:4,
              background: active ? meta.color : meta.border,
              color: active ? '#fff' : meta.color,
            }}>
              {meta.label}
            </span>
            {v.est_actuelle && (
              <span style={{ marginTop:4, fontSize:9, color: meta.color, fontWeight:600 }}>actuelle</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Shared hours grid ─────────────────────────────────────────────────────────
function HoursGrid({ hours, setHours, visibleKeys = MOIS_KEYS }: {
  hours: Record<string,string>
  setHours: (h: Record<string,string>) => void
  visibleKeys?: string[]
}) {
  const totalH = visibleKeys.reduce((s, k) => s + (Number(hours[k]) || 0), 0)
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <label style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Heures planifiées par mois</label>
        <span style={{ fontSize:12, fontWeight:700, color:'#2563eb', background:'#eff6ff', padding:'3px 10px', borderRadius:6 }}>
          Total : {totalH}h · {Math.round(totalH / visibleKeys.length / 160 * 100)}% moy.
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {visibleKeys.map(key => {
          const i     = MOIS_KEYS.indexOf(key)
          const label = MOIS_LABELS[i]
          const h     = Number(hours[key]) || 0
          const pct   = Math.round(h / 160 * 100)
          return (
            <div key={key} style={{
              background: h>0 ? (pct>100?'#fff5f5':pct>=80?'#fffbeb':'#f0fdf4') : '#f9fafb',
              border:`1px solid ${h>0?(pct>100?'#fca5a5':pct>=80?'#fcd34d':'#86efac'):'#e5e7eb'}`,
              borderRadius:10, padding:'10px 12px', transition:'background .2s, border-color .2s',
            }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input type="number" min="0" max="240" step="0.1" value={hours[key]}
                  onChange={e => setHours({ ...hours, [key]: e.target.value })}
                  placeholder="0"
                  style={{ width:'100%', border:'none', background:'transparent', fontSize:16, fontWeight:700, color:'#111827', outline:'none', fontFamily:'monospace' }}
                />
                <span style={{ fontSize:11, color:'#9ca3af', flexShrink:0 }}>h</span>
              </div>
              {h > 0 && <div style={{ fontSize:10, color:pct>100?'#ef4444':pct>=80?'#d97706':'#16a34a', marginTop:2, fontWeight:600 }}>{pct}%</div>}
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'#9ca3af', alignSelf:'center' }}>Remplissage rapide :</span>
        {[40,80,120,160].map(h => (
          <button key={h} type="button"
            onClick={() => setHours({ ...EMPTY_HOURS, ...Object.fromEntries(visibleKeys.map(k => [k, String(h)])) })}
            style={{ padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, background:'#f1f5f9', color:'#374151', border:'none', cursor:'pointer' }}>
            {h}h ({Math.round(h/160*100)}%)
          </button>
        ))}
        <button type="button" onClick={() => setHours(EMPTY_HOURS)}
          style={{ padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:600, background:'#fef2f2', color:'#ef4444', border:'none', cursor:'pointer' }}>
          Effacer
        </button>
      </div>
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ title, subtitle, icon, onClose, children }: {
  title: string; subtitle: string; icon: React.ReactNode
  onClose: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:680, boxShadow:'0 32px 80px rgba(0,0,0,.25)', maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.5rem 1.75rem', borderBottom:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'#111827' }}>{title}</div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:1 }}>{subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:4, borderRadius:6, display:'flex' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Consultant checklist (multi-select with search) ───────────────────────────
function ConsultantChecklist({ consultants, selectedIds, onChange }: {
  consultants: Consultant[]
  selectedIds: Set<number>
  onChange: (ids: Set<number>) => void
}) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = consultants.filter(c =>
    !q || c.code.toLowerCase().includes(q) || c.nom_complet.toLowerCase().includes(q)
  )
  const allVisible = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))

  function toggleOne(id: number) {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  function toggleAll() {
    const next = new Set(selectedIds)
    if (allVisible) filtered.forEach(c => next.delete(c.id))
    else filtered.forEach(c => next.add(c.id))
    onChange(next)
  }

  return (
    <div>
      <div style={{ position:'relative', marginBottom:8 }}>
        <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none' }}/>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Chercher consultant…"
          style={{ ...selectStyle, paddingLeft:32, paddingRight:search?32:12 }}
        />
        {search && (
          <button type="button" onClick={() => setSearch('')}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex' }}>
            <X size={13}/>
          </button>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <button type="button" onClick={toggleAll}
          style={{ fontSize:11, fontWeight:600, color:'#2563eb', background:'none', border:'none', cursor:'pointer', padding:0 }}>
          {allVisible ? 'Désélectionner tout' : 'Sélectionner tout'}
          {q && filtered.length < consultants.length ? ` (${filtered.length} filtrés)` : ''}
        </button>
        <span style={{ fontSize:11, color:'#9ca3af' }}>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
      </div>
      <div style={{ maxHeight:168, overflowY:'auto', border:'1px solid #d1d5db', borderRadius:9, background:'#fff' }}>
        {filtered.length === 0
          ? <div style={{ padding:'12px 14px', fontSize:12, color:'#9ca3af', textAlign:'center' }}>Aucun résultat</div>
          : filtered.map(c => {
              const checked = selectedIds.has(c.id)
              return (
                <label key={c.id} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'7px 12px',
                  cursor:'pointer', borderBottom:'1px solid #f1f5f9',
                  background: checked ? '#eff6ff' : 'transparent',
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleOne(c.id)}
                    style={{ width:14, height:14, accentColor:'#2563eb', cursor:'pointer', flexShrink:0 }}
                  />
                  <span style={{
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    minWidth:38, height:20, borderRadius:5, padding:'0 4px',
                    background: checked ? '#dbeafe' : '#f1f5f9',
                    fontFamily:'monospace', fontWeight:700, fontSize:10,
                    color: checked ? '#1d4ed8' : '#6b7280', flexShrink:0,
                  }}>{c.code}</span>
                  <span style={{ fontSize:12, fontWeight: checked ? 600 : 400, color: checked ? '#111827' : '#374151' }}>
                    {c.nom_complet}
                  </span>
                </label>
              )
            })
        }
      </div>
    </div>
  )
}

// ── Period banner ─────────────────────────────────────────────────────────────
function PeriodBanner({ visibleKeys }: { visibleKeys: string[] }) {
  const allMonths = visibleKeys.length === MOIS_KEYS.length
  return (
    <div style={{ background:'#f0f5ff', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
        {allMonths ? 'Toute l\'année — tous les mois actifs' : 'Période planifiée'}
      </div>
      <div style={{ display:'flex', gap:4 }}>
        {MOIS_KEYS.map((k, i) => {
          const active = visibleKeys.includes(k)
          return (
            <div key={k} style={{
              flex: active ? 2 : 1, padding:'6px 2px', borderRadius:7, textAlign:'center',
              background: active ? '#2563eb' : '#e5e7eb',
              color: active ? '#fff' : '#9ca3af',
              fontSize: active ? 11 : 10, fontWeight: active ? 700 : 400,
              transition:'all .2s', overflow:'hidden',
            }}>
              {MOIS_LABELS[i]}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Per-consultant hours table ─────────────────────────────────────────────────
function ConsultantHoursTable({ consultants, selectedIds, visibleKeys, consultantHours, setConsultantHours }: {
  consultants: Consultant[]
  selectedIds: Set<number>
  visibleKeys: string[]
  consultantHours: Record<number, Record<string,string>>
  setConsultantHours: React.Dispatch<React.SetStateAction<Record<number, Record<string,string>>>>
}) {
  if (selectedIds.size === 0) return null
  const selected = consultants.filter(c => selectedIds.has(c.id))

  function fillConsultant(cid: number, h: number) {
    setConsultantHours(prev => ({
      ...prev,
      [cid]: { ...EMPTY_HOURS, ...Object.fromEntries(visibleKeys.map(k => [k, String(h)])) },
    }))
  }

  function fillAll(h: number) {
    setConsultantHours(prev => {
      const next = { ...prev }
      for (const cid of selectedIds)
        next[cid] = { ...EMPTY_HOURS, ...Object.fromEntries(visibleKeys.map(k => [k, String(h)])) }
      return next
    })
  }

  return (
    <div style={{ marginBottom:20 }}>
      <PeriodBanner visibleKeys={visibleKeys} />

      {/* En-tête mois */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, paddingLeft:184 }}>
        {visibleKeys.map(k => (
          <div key={k} style={{ width:64, textAlign:'center', fontSize:10, fontWeight:700,
            color:'#2563eb', textTransform:'uppercase', letterSpacing:'.05em' }}>
            {MOIS_LABELS[MOIS_KEYS.indexOf(k)]}
          </div>
        ))}
        <div style={{ width:58, textAlign:'center', fontSize:10, fontWeight:700, color:'#374151' }}>Total</div>
      </div>

      {/* Lignes consultant */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {selected.map(c => {
          const cHours = consultantHours[c.id] ?? EMPTY_HOURS
          const total = visibleKeys.reduce((s, k) => s + (Number(cHours[k]) || 0), 0)
          return (
            <div key={c.id} style={{
              background:'#fafbff', borderRadius:12, border:'1px solid #e8eef8',
              padding:'10px 12px', display:'flex', alignItems:'center', gap:6, flexWrap:'nowrap',
            }}>
              {/* Badge + nom */}
              <div style={{ width:178, display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
                <span style={{
                  minWidth:40, padding:'3px 6px', borderRadius:6, background:'#eff6ff',
                  fontFamily:'monospace', fontWeight:700, fontSize:11, color:'#1d4ed8',
                  textAlign:'center', flexShrink:0,
                }}>
                  {c.code}
                </span>
                <span style={{ fontSize:12, fontWeight:500, color:'#111827', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {c.nom_complet}
                </span>
              </div>

              {/* Inputs mois actifs */}
              {visibleKeys.map(k => {
                const val = Number(cHours[k]) || 0
                const pct = val / 160
                const borderColor = val > 160 ? '#fca5a5' : val > 0 ? '#86efac' : '#dde5f8'
                const bg = val > 160 ? '#fff5f5' : val > 0 ? '#f0fdf4' : '#fff'
                return (
                  <div key={k} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
                    <input
                      type="number" min="0" max="240" step="0.1"
                      value={cHours[k]} placeholder="0"
                      onChange={e => setConsultantHours(prev => ({
                        ...prev,
                        [c.id]: { ...(prev[c.id] ?? EMPTY_HOURS), [k]: e.target.value },
                      }))}
                      style={{
                        width:60, height:38, borderRadius:8, border:`1.5px solid ${borderColor}`,
                        background:bg, textAlign:'center', fontSize:15, fontWeight:700,
                        fontFamily:'monospace', outline:'none',
                        color: val > 160 ? '#dc2626' : '#111827',
                      }}
                    />
                    <div style={{ width:54, height:3, background:'#e5e7eb', borderRadius:2 }}>
                      <div style={{
                        width:`${Math.min(pct * 100, 100)}%`, height:3, borderRadius:2,
                        background: val > 160 ? '#ef4444' : val > 0 ? '#22c55e' : 'transparent',
                      }} />
                    </div>
                  </div>
                )
              })}

              {/* Total */}
              <div style={{ width:58, textAlign:'center', flexShrink:0 }}>
                <span style={{ fontWeight:800, fontFamily:'monospace', fontSize:14,
                  color: total > 0 ? '#2563eb' : '#9ca3af' }}>
                  {total}h
                </span>
              </div>

              {/* Quick-fill ligne */}
              <div style={{ display:'flex', gap:3, marginLeft:'auto', flexShrink:0 }}>
                {[40,80,120,160].map(h => (
                  <button key={h} type="button" onClick={() => fillConsultant(c.id, h)}
                    style={{
                      padding:'4px 7px', borderRadius:6, fontSize:10, fontWeight:600,
                      background:'#f1f5f9', color:'#374151', border:'1px solid #e5e7eb', cursor:'pointer',
                    }}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick-fill global */}
      <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center' }}>
        <span style={{ fontSize:11, color:'#9ca3af', flexShrink:0 }}>Appliquer à tous :</span>
        {[40,80,120,160].map(h => (
          <button key={h} type="button" onClick={() => fillAll(h)}
            style={{ padding:'5px 14px', borderRadius:7, fontSize:12, fontWeight:700,
              background:'#2563eb', color:'#fff', border:'none', cursor:'pointer' }}>
            {h}h
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Inline Week Editor ────────────────────────────────────────────────────────
function InlineWeekEditor({ affectationId, annee, onSaved }: {
  affectationId: number; annee: number; onSaved: () => void
}) {
  const NAVY = '#162B6E'
  const [data,       setData]       = useState<MonthWeeks[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [openMonths, setOpenMonths] = useState<Set<number>>(new Set([1,2,3,4,5,6,7,8,9,10,11,12]))

  useEffect(() => {
    setLoading(true)
    api.get(`/planning/${affectationId}/semaines?annee=${annee}`)
      .then(r => setData(r.data))
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [affectationId, annee])

  function updateWeek(mi: number, si: number, val: string) {
    const h = Math.max(0, parseFloat(val) || 0)
    setData(prev => prev.map((m, mii) => {
      if (mii !== mi) return m
      const semaines = m.semaines.map((s, sii) => sii !== si ? s : { ...s, heures: h })
      return { ...m, semaines, total_heures: parseFloat(semaines.reduce((a, s) => a + s.heures, 0).toFixed(1)) }
    }))
  }

  function fillMonth(mi: number, h: number) {
    setData(prev => prev.map((m, mii) => {
      if (mii !== mi) return m
      const n = m.semaines.length
      const each = n > 0 ? parseFloat((h / n).toFixed(1)) : 0
      const semaines = m.semaines.map(s => ({ ...s, heures: each }))
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
      setError(err.response?.data?.detail ?? "Erreur lors de l'enregistrement.")
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding:'20px 0', textAlign:'center', color:'#6b7280', fontSize:13 }}>Chargement des semaines…</div>

  return (
    <div style={{ paddingTop:12 }}>
      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:7, padding:'8px 12px', marginBottom:10, fontSize:12, color:'#dc2626' }}>
          {error}
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {data.map((m, mi) => (
          <div key={m.mois} style={{ border:'1px solid #e5e7eb', borderRadius:9, overflow:'hidden' }}>
            <div
              onClick={() => toggleMonth(m.mois)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', cursor:'pointer', userSelect:'none', background: openMonths.has(m.mois) ? '#EEF3FB' : '#f9fafb' }}
            >
              <span style={{ fontSize:13, fontWeight:700, color:NAVY }}>{m.mois_label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#374151', background:'#fff', border:'1px solid #e5e7eb', padding:'2px 10px', borderRadius:6 }}>{m.total_heures.toFixed(1)}h</span>
                {[40, 80, 160].map(h => (
                  <button key={h} type="button" onClick={e => { e.stopPropagation(); fillMonth(mi, h) }}
                    style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4, border:'1px solid #e5e7eb', cursor:'pointer', background:'#f9fafb', color:'#374151' }}>
                    {h}h
                  </button>
                ))}
                {openMonths.has(m.mois) ? <ChevronDown size={14} color="#6b7280"/> : <ChevronRight size={14} color="#6b7280"/>}
              </div>
            </div>
            {openMonths.has(m.mois) && (
              <div style={{ borderTop:'1px solid #f3f4f6' }}>
                {m.semaines.map((s, si) => (
                  <div key={s.iso_week} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderBottom: si < m.semaines.length-1 ? '1px solid #f9fafb' : 'none' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#6b7280', fontFamily:'monospace', width:26, flexShrink:0 }}>S{s.iso_week}</span>
                    <span style={{ fontSize:11, color:'#9ca3af', flex:1 }}>{s.date_debut} → {s.date_fin}</span>
                    <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                      {[0, 8, 16, 40].map(h => (
                        <button key={h} type="button" onClick={() => updateWeek(mi, si, String(h))}
                          style={{ fontSize:10, fontWeight:600, padding:'2px 5px', borderRadius:4, border:'1px solid #e5e7eb', cursor:'pointer', background: s.heures === h ? NAVY : '#f9fafb', color: s.heures === h ? '#fff' : '#374151' }}>
                          {h}h
                        </button>
                      ))}
                    </div>
                    <input type="number" min={0} step={0.5} value={s.heures || ''} onChange={e => updateWeek(mi, si, e.target.value)} placeholder="0"
                      style={{ width:52, padding:'4px 7px', fontSize:13, fontWeight:600, border:`1.5px solid ${NAVY}40`, borderRadius:7, outline:'none', textAlign:'right', fontFamily:'monospace', flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'#9ca3af' }}>h</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 22px', borderRadius:100, background:'#162B6E', color:'#fff', border:'none', cursor:saving?'not-allowed':'pointer', opacity:saving?0.65:1, fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(22,43,110,.25)', transition:'all .18s' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background='#1E3A8A' }}
          onMouseLeave={e => { e.currentTarget.style.background='#162B6E' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer les semaines'}
        </button>
      </div>
    </div>
  )
}

// ── New Planning Modal ────────────────────────────────────────────────────────
function NewPlanModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const currentYear = new Date().getFullYear()
  const NAVY = '#162B6E'

  const [consultants,    setConsultants]    = useState<Consultant[]>([])
  const [projets,        setProjets]        = useState<Projet[]>([])
  const [yearVersions,   setYearVersions]   = useState<Version[]>([])
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null)
  const [selectedIds,    setSelectedIds]    = useState<Set<number>>(new Set())
  const [versionId,      setVersionId]      = useState<number | null>(null)
  const [annee,          setAnnee]          = useState(currentYear)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const [weekData,       setWeekData]       = useState<MonthWeeks[]>([])
  const [weekLoading,    setWeekLoading]    = useState(false)
  const [openMonths,     setOpenMonths]     = useState<Set<number>>(new Set<number>())

  const visibleKeys      = getVisibleKeys(selectedProjet)
  const visibleWeekData  = weekData.filter(m => visibleKeys.includes(MOIS_KEYS[m.mois - 1]))
  const totalH           = parseFloat(visibleWeekData.reduce((a, m) => a + m.total_heures, 0).toFixed(1))

  const quarterBadges = selectedProjet
    ? (['q1','q2','q3','q4'] as const).map(q => ({
        key: q,
        label: q.toUpperCase(),
        active: selectedProjet[q],
        months: QUARTER_MONTHS[q].map(k => MOIS_LABELS[MOIS_KEYS.indexOf(k)]).join('–'),
      }))
    : []

  function openFirstMonth(data: MonthWeeks[], vk: string[]) {
    const first = data.find(m => vk.includes(MOIS_KEYS[m.mois - 1]))
    setOpenMonths(new Set(first ? [first.mois] : []))
  }

  const fetchYearVersions = (y: number) => {
    api.get(`/planning/versions?annee=${y}`)
      .then(r => {
        const vlist: Version[] = r.data
        setYearVersions(vlist)
        const def = vlist.find(v => v.est_actuelle) ?? vlist[0]
        setVersionId(def?.id ?? null)
      })
      .catch(() => {})
  }

  async function loadWeekTemplate(y: number, vk?: string[]) {
    setWeekLoading(true)
    try {
      const r = await api.get(`/planning/semaines-template?annee=${y}`)
      setWeekData(r.data)
      openFirstMonth(r.data, vk ?? visibleKeys)
    } catch {} finally { setWeekLoading(false) }
  }

  useEffect(() => {
    api.get('/consultants').then(r => setConsultants(r.data)).catch(() => {})
    api.get('/projets').then(r => setProjets(r.data)).catch(() => {})
    fetchYearVersions(currentYear)
    loadWeekTemplate(currentYear, MOIS_KEYS)
  }, [])

  function handleYearChange(y: number) {
    setAnnee(y)
    setVersionId(null)
    fetchYearVersions(y)
    loadWeekTemplate(y)
  }

  function handleProjetChange(id: string) {
    const projet = projets.find(p => p.id === Number(id)) ?? null
    setSelectedProjet(projet)
    const vk = getVisibleKeys(projet)
    if (weekData.length > 0) openFirstMonth(weekData, vk)
  }

  function updateWeek(realIdx: number, weekIdx: number, val: string) {
    const h = Math.max(0, parseFloat(val) || 0)
    setWeekData(prev => prev.map((m, mi) => {
      if (mi !== realIdx) return m
      const semaines = m.semaines.map((s, si) => si !== weekIdx ? s : { ...s, heures: h })
      return { ...m, semaines, total_heures: parseFloat(semaines.reduce((a, s) => a + s.heures, 0).toFixed(1)) }
    }))
  }

  function fillMonth(realIdx: number, totalFill: number) {
    const count = weekData[realIdx]?.semaines.length
    if (!count) return
    const perWeek = parseFloat((totalFill / count).toFixed(1))
    setWeekData(prev => prev.map((m, mi) => {
      if (mi !== realIdx) return m
      const semaines = m.semaines.map(s => ({ ...s, heures: perWeek }))
      return { ...m, semaines, total_heures: parseFloat((perWeek * count).toFixed(1)) }
    }))
  }

  function toggleMonth(mois: number) {
    setOpenMonths(prev => { const n = new Set(prev); n.has(mois) ? n.delete(mois) : n.add(mois); return n })
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!selectedProjet || selectedIds.size === 0 || !versionId) {
      setError('Sélectionnez un projet, au moins un consultant, et une version.')
      return
    }
    setSaving(true); setError('')
    const flat = visibleWeekData.flatMap(m =>
      m.semaines.map(s => ({ iso_week: s.iso_week, annee, heures: s.heures }))
    )
    const errors: string[] = []
    for (const consultantId of selectedIds) {
      try {
        const body: Record<string,number> = {
          consultant_id: consultantId,
          projet_id: selectedProjet.id,
          version_id: versionId,
        }
        MOIS_KEYS.forEach(k => { body[`heures_${k}`] = 0 })
        const createRes = await api.post('/planning/', body)
        if (flat.some(s => s.heures > 0)) {
          await api.put(`/planning/${createRes.data.id}/semaines`, flat)
        }
      } catch (err: any) {
        const c = consultants.find(x => x.id === consultantId)
        errors.push(`[${c?.code ?? consultantId}] ${err.response?.data?.detail ?? 'Erreur'}`)
      }
    }
    setSaving(false)
    if (errors.length) setError(errors.join(' · '))
    else onSaved()
  }

  return (
    <ModalShell title="Nouvelle planification" subtitle="Affecter des consultants à un projet" icon={<Plus size={18} color="#fff"/>} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ padding:'1.5rem 1.75rem', display:'flex', flexDirection:'column', gap:18 }}>

        {/* ── ① Consultants ──────────────────────────────────── */}
        <div>
          <label style={labelStyle}>
            ① Consultants
            {selectedIds.size > 0 && (
              <span style={{ marginLeft:8, fontSize:11, fontWeight:600, color:NAVY, background:'#EEF3FB', padding:'2px 9px', borderRadius:10 }}>
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
            )}
          </label>
          <ConsultantChecklist consultants={consultants} selectedIds={selectedIds} onChange={setSelectedIds} />
        </div>

        {/* ── ② Projet ───────────────────────────────────────── */}
        <div>
          <label style={labelStyle}>② Projet *</label>
          <select value={selectedProjet?.id ?? ''} onChange={e => handleProjetChange(e.target.value)} required style={selectStyle}>
            <option value="">Choisir un projet…</option>
            {projets.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.wbs_code})</option>)}
          </select>
          {selectedProjet && (
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              {quarterBadges.map(({ key, label, active, months }) => (
                <span key={key} style={{
                  display:'inline-flex', flexDirection:'column', alignItems:'center',
                  padding:'4px 12px', borderRadius:8, fontSize:11, fontWeight:700, lineHeight:1.4,
                  background: active ? '#eff6ff' : '#f9fafb',
                  color: active ? '#1d4ed8' : '#9ca3af',
                  border:`1.5px solid ${active ? '#bfdbfe' : '#e5e7eb'}`,
                }}>
                  <span>{label} {active ? '●' : '○'}</span>
                  <span style={{ fontSize:9, fontWeight:500, opacity:.75 }}>{months}</span>
                </span>
              ))}
              {!quarterBadges.some(b => b.active) && (
                <span style={{ fontSize:11, color:'#9ca3af', fontStyle:'italic', alignSelf:'center' }}>
                  Tous les mois affichés
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── ③ Année + Version ──────────────────────────────── */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <label style={{ ...labelStyle, marginBottom:0 }}>③ Année *</label>
            <YearPicker value={annee} onChange={handleYearChange} />
          </div>
          <label style={{ ...labelStyle, marginBottom:8 }}>Version *</label>
          <VersionCards versions={yearVersions} selected={versionId} onChange={setVersionId} />
        </div>

        {/* ── ④ Planification semaine par semaine ────────────── */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <label style={{ ...labelStyle, marginBottom:0 }}>
              ④ Planification
              {visibleWeekData.length > 0 && (
                <span style={{ marginLeft:8, fontSize:10, color:'#6b7280', fontWeight:400 }}>
                  {visibleWeekData.length} mois · {visibleWeekData.reduce((a, m) => a + m.semaines.length, 0)} semaines
                </span>
              )}
            </label>
            {visibleWeekData.length > 0 && (
              <div style={{ display:'flex', gap:4 }}>
                <button type="button" onClick={() => setOpenMonths(new Set(visibleWeekData.map(m => m.mois)))}
                  style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:5, border:'1px solid #e5e7eb', background:'#f9fafb', color:'#374151', cursor:'pointer' }}>
                  Tout ouvrir
                </button>
                <button type="button" onClick={() => setOpenMonths(new Set())}
                  style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:5, border:'1px solid #e5e7eb', background:'#f9fafb', color:'#374151', cursor:'pointer' }}>
                  Tout fermer
                </button>
              </div>
            )}
          </div>

          {weekLoading ? (
            <div style={{ textAlign:'center', padding:'28px 0', color:'#6b7280', fontSize:13 }}>Chargement du calendrier…</div>
          ) : visibleWeekData.length === 0 ? (
            <div style={{ textAlign:'center', padding:'28px 0', color:'#9ca3af', fontSize:12, border:'1px dashed #e5e7eb', borderRadius:10 }}>
              Aucune semaine disponible pour {annee}. Vérifiez la configuration du calendrier.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:380, overflowY:'auto' }}>
              {selectedIds.size > 1 && (
                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e', flexShrink:0 }}>
                  Ces heures seront appliquées aux {selectedIds.size} consultants sélectionnés.
                </div>
              )}
              {visibleWeekData.map(m => {
                const realIdx = weekData.findIndex(w => w.mois === m.mois)
                const isOpen  = openMonths.has(m.mois)
                return (
                  <div key={m.mois} style={{ border:`1.5px solid ${isOpen ? NAVY+'30' : '#e5e7eb'}`, borderRadius:10, overflow:'hidden', flexShrink:0 }}>
                    {/* Month header */}
                    <div
                      onClick={() => toggleMonth(m.mois)}
                      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', cursor:'pointer', userSelect:'none', background: isOpen ? '#EEF3FB' : '#f9fafb' }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:700, color: isOpen ? NAVY : '#374151', letterSpacing:'.03em' }}>
                          {m.mois_label.toUpperCase()}
                        </span>
                        <span style={{
                          fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:6,
                          background: m.total_heures > 0 ? '#EEF3FB' : '#f3f4f6',
                          color: m.total_heures > 0 ? NAVY : '#9ca3af',
                          border:`1px solid ${m.total_heures > 0 ? NAVY+'30' : '#e5e7eb'}`,
                        }}>
                          {m.total_heures.toFixed(1)}h
                        </span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ display:'flex', gap:3 }} onClick={e => e.stopPropagation()}>
                          {[40, 80, 160].map(h => (
                            <button key={h} type="button" onClick={() => { fillMonth(realIdx, h); setOpenMonths(prev => new Set([...prev, m.mois])) }}
                              style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, border:`1px solid ${NAVY}30`, cursor:'pointer', background:'#fff', color:NAVY }}>
                              {h}h
                            </button>
                          ))}
                        </div>
                        {isOpen ? <ChevronDown size={14} color="#6b7280"/> : <ChevronRight size={14} color="#6b7280"/>}
                      </div>
                    </div>
                    {/* Week rows */}
                    {isOpen && (
                      <div style={{ borderTop:'1px solid #f3f4f6' }}>
                        {m.semaines.map((s, si) => (
                          <div key={s.iso_week} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', borderBottom: si < m.semaines.length-1 ? '1px solid #f9fafb' : 'none', background:'#fff' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'#6b7280', fontFamily:'monospace', width:26, flexShrink:0 }}>S{s.iso_week}</span>
                            <span style={{ fontSize:10, color:'#9ca3af', flex:1 }}>{s.date_debut} → {s.date_fin}</span>
                            {s.heures_dispo !== undefined && (
                              <span style={{ fontSize:9, color:'#d1d5db', fontFamily:'monospace', flexShrink:0 }}>/{s.heures_dispo}h</span>
                            )}
                            <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                              {[0,8,16,40].map(h => (
                                <button key={h} type="button" onClick={() => updateWeek(realIdx, si, String(h))}
                                  style={{ fontSize:10, fontWeight:600, padding:'2px 5px', borderRadius:4, border:'1px solid #e5e7eb', cursor:'pointer', background: s.heures===h ? NAVY : '#f9fafb', color: s.heures===h ? '#fff' : '#374151' }}>
                                  {h}h
                                </button>
                              ))}
                            </div>
                            <input
                              type="number" min={0} step={0.5} value={s.heures||''} placeholder="0"
                              onChange={e => updateWeek(realIdx, si, e.target.value)}
                              style={{ width:52, padding:'4px 7px', fontSize:13, fontWeight:600, border:`1.5px solid ${NAVY}40`, borderRadius:7, outline:'none', textAlign:'right', fontFamily:'monospace', flexShrink:0 }}
                            />
                            <span style={{ fontSize:11, color:'#9ca3af' }}>h</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary bar */}
          {totalH > 0 && selectedIds.size > 0 && (
            <div style={{ marginTop:10, padding:'8px 14px', background:'#f0f5ff', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'#374151' }}>
                Total planifié : <strong style={{ color:NAVY }}>{totalH}h</strong>
                {selectedIds.size > 1 && (
                  <span style={{ color:'#6b7280', marginLeft:8 }}>
                    × {selectedIds.size} consultants = <strong>{parseFloat((totalH * selectedIds.size).toFixed(1))}h</strong>
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626', display:'flex', gap:8, alignItems:'center' }}>
            <X size={14}/> {error}
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:8, borderTop:'1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose}
            style={{ padding:'9px 20px', borderRadius:100, fontSize:13, fontWeight:500, background:'#F5F6F8', color:'#5A6472', border:'1px solid #E0E4E8', cursor:'pointer' }}>
            Annuler
          </button>
          <button type="submit" disabled={saving || totalH === 0}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 22px', borderRadius:100, fontSize:13, fontWeight:700, background:'#162B6E', color:'#fff', border:'none', cursor:(saving||totalH===0)?'not-allowed':'pointer', opacity:(saving||totalH===0)?0.55:1, boxShadow:'0 4px 14px rgba(22,43,110,.25)', transition:'all .18s' }}
            onMouseEnter={e => { if (!saving && totalH > 0) e.currentTarget.style.background='#1E3A8A' }}
            onMouseLeave={e => { e.currentTarget.style.background='#162B6E' }}>
            {saving
              ? `Enregistrement… (${selectedIds.size})`
              : <><Plus size={15}/> Créer{selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}</>
            }
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Edit Planning Modal ───────────────────────────────────────────────────────
function EditPlanModal({ target, versionId, annee, onClose, onSaved }: {
  target: EditTarget; versionId: number; annee: number; onClose: () => void; onSaved: () => void
}) {
  const NAVY = '#162B6E'
  const visibleKeys = getVisibleKeys({ q1:target.q1, q2:target.q2, q3:target.q3, q4:target.q4 } as Projet)
  const initHours = Object.fromEntries(MOIS_KEYS.map((k, i) => [k, String(target.mois[MOIS_LABELS[i]]?.heures || '')]))
  const [hours,       setHours]      = useState<Record<string,string>>(initHours)
  const [saving,      setSaving]     = useState(false)
  const [error,       setError]      = useState('')
  const [tab,         setTab]        = useState<'mois'|'semaine'>('mois')
  const [weekData,    setWeekData]   = useState<MonthWeeks[]>([])
  const [weekLoading, setWeekLoading] = useState(false)
  const [openMonths,  setOpenMonths] = useState<Set<number>>(new Set([1,2,3,4,5,6,7,8,9,10,11,12]))

  const totalH = visibleKeys.reduce((s, k) => s + (Number(hours[k]) || 0), 0)
  const totalWeekH = parseFloat(weekData.reduce((a, m) => a + m.total_heures, 0).toFixed(1))

  async function loadWeeks() {
    setWeekLoading(true)
    setError('')
    try {
      const r = await api.get(`/planning/${target.affectation_id}/semaines?annee=${annee}`)
      setWeekData(r.data)
    } catch {
      setError('Impossible de charger les semaines.')
    } finally {
      setWeekLoading(false)
    }
  }

  function switchTab(t: 'mois'|'semaine') {
    setTab(t)
    setError('')
    if (t === 'semaine' && weekData.length === 0) loadWeeks()
  }

  function updateWeek(moisIdx: number, weekIdx: number, val: string) {
    const h = Math.max(0, parseFloat(val) || 0)
    setWeekData(prev => prev.map((m, mi) => {
      if (mi !== moisIdx) return m
      const semaines = m.semaines.map((s, si) => si !== weekIdx ? s : { ...s, heures: h })
      return { ...m, semaines, total_heures: parseFloat(semaines.reduce((a, s) => a + s.heures, 0).toFixed(1)) }
    }))
  }

  function toggleMonth(mois: number) {
    setOpenMonths(prev => { const n = new Set(prev); n.has(mois) ? n.delete(mois) : n.add(mois); return n })
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (tab === 'mois') {
        const body: Record<string,number> = { consultant_id:target.consultant_id, projet_id:target.projet_id, version_id:versionId }
        MOIS_KEYS.forEach(k => { body[`heures_${k}`] = Number(hours[k]) || 0 })
        await api.put(`/planning/${target.affectation_id}`, body)
      } else {
        const flat = weekData.flatMap(m =>
          m.semaines.map(s => ({ iso_week: s.iso_week, annee, heures: s.heures }))
        )
        await api.put(`/planning/${target.affectation_id}/semaines`, flat)
      }
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Erreur lors de la mise à jour.')
    } finally { setSaving(false) }
  }

  return (
    <ModalShell
      title="Modifier la planification"
      subtitle={`[${target.code}] ${target.nom} — ${tab === 'mois' ? totalH : totalWeekH}h planifiées`}
      icon={<Pencil size={16} color="#fff"/>}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ padding:'1.5rem 1.75rem' }}>
        {/* Consultant / Project info */}
        <div style={{ background:'#f8faff', border:'1px solid #e0eaff', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:20 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.05em' }}>Consultant</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1e3a6e', marginTop:2 }}>[{target.code}] {target.nom}</div>
          </div>
          <div style={{ width:1, background:'#e0eaff' }} />
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.05em' }}>Projet</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1e3a6e', marginTop:2 }}>{target.projet_nom}</div>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{ display:'flex', gap:6, marginBottom:16, background:'#f3f4f6', borderRadius:10, padding:4 }}>
          {(['mois','semaine'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              style={{
                flex:1, padding:'7px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? NAVY : '#6b7280',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.10)' : 'none',
                transition: 'all .15s',
              }}
            >
              {t === 'mois' ? 'Par mois' : 'Par semaine'}
            </button>
          ))}
        </div>

        {/* Monthly tab */}
        {tab === 'mois' && (
          <>
            <PeriodBanner visibleKeys={visibleKeys} />
            <HoursGrid hours={hours} setHours={setHours} visibleKeys={visibleKeys} />
          </>
        )}

        {/* Weekly tab */}
        {tab === 'semaine' && (
          <div style={{ marginBottom:16 }}>
            {weekLoading ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#6b7280', fontSize:14 }}>
                Chargement des semaines…
              </div>
            ) : weekData.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af', fontSize:13 }}>
                Aucune semaine disponible pour {annee}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:380, overflowY:'auto' }}>
                {weekData.map((m, mi) => (
                  <div key={m.mois} style={{ border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden' }}>
                    <div
                      onClick={() => toggleMonth(m.mois)}
                      style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'10px 14px', cursor:'pointer', userSelect:'none',
                        background: openMonths.has(m.mois) ? '#EEF3FB' : '#f9fafb',
                      }}
                    >
                      <span style={{ fontSize:13, fontWeight:700, color:NAVY }}>{m.mois_label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#374151', background:'#fff', border:'1px solid #e5e7eb', padding:'2px 10px', borderRadius:6 }}>
                          {m.total_heures.toFixed(1)}h
                        </span>
                        {openMonths.has(m.mois)
                          ? <ChevronDown size={14} color="#6b7280"/>
                          : <ChevronRight size={14} color="#6b7280"/>}
                      </div>
                    </div>
                    {openMonths.has(m.mois) && (
                      <div style={{ borderTop:'1px solid #f3f4f6' }}>
                        {m.semaines.map((s, si) => (
                          <div key={s.iso_week} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', borderBottom: si < m.semaines.length-1 ? '1px solid #f9fafb' : 'none' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'#6b7280', fontFamily:'monospace', width:26, flexShrink:0 }}>S{s.iso_week}</span>
                            <span style={{ fontSize:11, color:'#9ca3af', flex:1 }}>{s.date_debut} → {s.date_fin}</span>
                            <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                              {[0, 8, 16, 40].map(h => (
                                <button
                                  key={h} type="button" onClick={() => updateWeek(mi, si, String(h))}
                                  style={{
                                    fontSize:10, fontWeight:600, padding:'2px 5px', borderRadius:4,
                                    border:'1px solid #e5e7eb', cursor:'pointer',
                                    background: s.heures === h ? NAVY : '#f9fafb',
                                    color: s.heures === h ? '#fff' : '#374151',
                                  }}
                                >{h}h</button>
                              ))}
                            </div>
                            <input
                              type="number" min={0} step={0.5}
                              value={s.heures || ''}
                              onChange={e => updateWeek(mi, si, e.target.value)}
                              placeholder="0"
                              style={{
                                width:52, padding:'4px 7px', fontSize:13, fontWeight:600,
                                border:`1.5px solid ${NAVY}40`, borderRadius:7, outline:'none',
                                textAlign:'right', fontFamily:'monospace', flexShrink:0,
                              }}
                            />
                            <span style={{ fontSize:11, color:'#9ca3af' }}>h</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626', display:'flex', gap:8, alignItems:'center' }}>
            <X size={14}/> {error}
          </div>
        )}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:8, borderTop:'1px solid #f1f5f9' }}>
          <button type="button" onClick={onClose}
            style={{ padding:'9px 20px', borderRadius:100, fontSize:13, fontWeight:500, background:'#F5F6F8', color:'#5A6472', border:'1px solid #E0E4E8', cursor:'pointer' }}>
            Annuler
          </button>
          <button type="submit" disabled={saving}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 22px', borderRadius:100, fontSize:13, fontWeight:700, background:'#162B6E', color:'#fff', border:'none', cursor:saving?'not-allowed':'pointer', opacity:saving?0.65:1, boxShadow:'0 4px 14px rgba(22,43,110,.25)', transition:'all .18s' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background='#1E3A8A' }}
            onMouseLeave={e => { e.currentTarget.style.background='#162B6E' }}>
            {saving ? 'Enregistrement…' : <><Pencil size={14}/> Enregistrer</>}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { selectedYear, setSelectedYear } = usePlanningYearStore()
  const t = useT().planning
  const [data,         setData]         = useState<ConsultantRow[]>([])
  const [versions,     setVersions]     = useState<Version[]>([])
  const [toolbarVers,  setToolbarVers]  = useState<Version[]>([])
  const [toolbarYear,  setToolbarYear]  = useState<number>(selectedYear ?? new Date().getFullYear())
  const [versionId,    setVersionId]    = useState<number | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [filterDiv,    setFilterDiv]    = useState('ALL')
  const [search,       setSearch]       = useState('')
  const [display,      setDisplay]      = useState<DisplayMode>('pct')
  const [expanded,              setExpanded]              = useState<Set<number>>(new Set())
  const [expandedProjectWeeks, setExpandedProjectWeeks] = useState<Set<number>>(new Set())
  const [showNew,      setShowNew]      = useState(false)
  const [editTarget,   setEditTarget]   = useState<EditTarget | null>(null)
  const [projetsAll,   setProjetsAll]   = useState<Projet[]>([])
  const [consultants,  setConsultants]  = useState<Consultant[]>([])

  useEffect(() => {
    api.get('/projets').then(r => setProjetsAll(r.data)).catch(() => {})
    api.get('/consultants').then(r => setConsultants(r.data)).catch(() => {})
    api.get('/planning/versions').then(r => {
      const vers: Version[] = r.data
      setVersions(vers)
      // Respect the year chosen on the year-selection screen; fall back to est_actuelle
      const targetYear = selectedYear
        ?? vers.find(v => v.est_actuelle)?.annee
        ?? vers[0]?.annee
      if (!targetYear) return
      setToolbarYear(targetYear)
      const versForYear = vers.filter(v => v.annee === targetYear)
      setToolbarVers(versForYear)
      const def = versForYear.find(v => v.est_actuelle) ?? versForYear[0]
      if (def) setVersionId(def.id)
    }).catch(() => {})
  }, [])

  function handleToolbarYearChange(y: number) {
    setToolbarYear(y)
    setSelectedYear(y)
    api.get(`/planning/versions?annee=${y}`).then(r => {
      const vlist: Version[] = r.data
      setVersions(prev => {
        const ids = new Set(prev.map(v => v.id))
        return [...prev, ...vlist.filter(v => !ids.has(v.id))]
      })
      setToolbarVers(vlist)
      const def = vlist.find(v => v.est_actuelle) ?? vlist[0]
      if (def) setVersionId(def.id)
    }).catch(() => {})
  }

  async function handleExport() {
    const params = new URLSearchParams({ annee: String(toolbarYear) })
    if (versionId) params.set('version_id', String(versionId))
    const resp = await api.get(`/planning/export-semaines?${params}`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([resp.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `planning_hebdomadaire_${toolbarYear}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const fetchData = () => {
    if (!versionId) return
    setLoading(true)
    setExpandedProjectWeeks(new Set())
    api.get(`/planning/detail-par-consultant?version_id=${versionId}`)
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [versionId])

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })

  const toggleProjectWeeks = (affId: number) =>
    setExpandedProjectWeeks(prev => { const n = new Set(prev); n.has(affId)?n.delete(affId):n.add(affId); return n })

  const q = search.trim().toLowerCase()
  const filtered = data
    .filter(c => filterDiv === 'ALL' || c.division === filterDiv)
    .filter(c =>
      !q ||
      c.nom.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.projets.some(p => p.projet_nom.toLowerCase().includes(q) || p.projet_code.toLowerCase().includes(q))
    )

  const divisions     = [...new Set(data.map(c => c.division).filter(Boolean))]
  const currentVersion = versions.find(v => v.id === versionId)
  const annee         = currentVersion?.annee ?? toolbarYear

  const avgMois = MOIS_LABELS.map(label => {
    if (!filtered.length) return { heures:0, pct:0 }
    return {
      pct:    Math.round(filtered.map(c=>c.total_par_mois[label]?.pct??0).reduce((a,b)=>a+b,0)/filtered.length),
      heures: Math.round(filtered.map(c=>c.total_par_mois[label]?.heures??0).reduce((a,b)=>a+b,0)/filtered.length),
    }
  })

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="border-b border-border pb-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-1 h-10 rounded-full bg-primary" />
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{t.title}</h2>
                <span style={{ background:'#eff6ff', color:'#2563eb', fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:6, letterSpacing:'.04em' }}>{annee}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Affectations consultant → projet · heures &amp; taux d'utilisation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Search */}
            <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
              <Search size={14} style={{ position:'absolute', left:10, color:'#9ca3af', pointerEvents:'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Chercher consultant ou projet…"
                style={{
                  paddingLeft:32, paddingRight:search?32:12, paddingTop:8, paddingBottom:8,
                  border:'1px solid var(--border)', borderRadius:9,
                  fontSize:13, color:'var(--foreground)', background:'var(--background)',
                  outline:'none', width:230,
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, background:'none', border:'none', cursor:'pointer', color:'#9ca3af', display:'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ALL">Toutes divisions</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
              {(['pct','heures'] as DisplayMode[]).map(m => (
                <button key={m} onClick={() => setDisplay(m)} style={{ padding:'7px 14px', fontSize:13, fontWeight:500, cursor:'pointer', background:display===m?'#2563eb':'transparent', color:display===m?'#fff':'var(--foreground)', border:'none', transition:'background .15s' }}>
                  {m==='pct'? t.pct : t.hours}
                </button>
              ))}
            </div>

            <button
              onClick={fetchData}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:38, height:38, borderRadius:100, background:'#F5F6F8', border:'1px solid #E0E4E8', color:'#5A6472', cursor:'pointer', transition:'all .18s', flexShrink:0 }}
              onMouseEnter={e => e.currentTarget.style.background='#E0E4E8'}
              onMouseLeave={e => e.currentTarget.style.background='#F5F6F8'}
              title={t.refresh}
            ><RefreshCw size={14}/></button>
            <button
              onClick={handleExport}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:100, background:'#F5F6F8', border:'1px solid #E0E4E8', color:'#5A6472', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all .18s' }}
              onMouseEnter={e => e.currentTarget.style.background='#E0E4E8'}
              onMouseLeave={e => e.currentTarget.style.background='#F5F6F8'}
            ><Download size={14}/>{t.download}</button>
            <button
              onClick={() => setShowNew(true)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 22px', borderRadius:100, background:'#162B6E', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, boxShadow:'0 4px 16px rgba(22,43,110,.25)', transition:'all .18s' }}
              onMouseEnter={e => e.currentTarget.style.background='#1E3A8A'}
              onMouseLeave={e => e.currentTarget.style.background='#162B6E'}
            ><Plus size={15}/>{t.addProject}</button>
          </div>
        </div>

        {/* Année + Version selector */}
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#6b7280' }}>Année :</span>
            <YearPicker value={toolbarYear} onChange={handleToolbarYearChange} />
          </div>
          <VersionCards versions={toolbarVers} selected={versionId} onChange={setVersionId} />
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Consultants', value:filtered.length,                                                                                   accent:'#2563eb' },
          { label:'Taux moyen',  value:`${filtered.length?Math.round(filtered.reduce((s,c)=>s+c.taux_moyen,0)/filtered.length):0}%`,      accent:'#10b981' },
          { label:'Taux max',    value:`${filtered.length?Math.round(Math.max(...filtered.map(c=>c.taux_max))):0}%`,                      accent:'#f59e0b' },
          { label:'Surchargés',  value:filtered.filter(c=>c.surcharge).length,                                                            accent:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5 border-l-4 hover:shadow-md transition-all" style={{ borderLeftColor:s.accent }}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-3xl font-extrabold leading-none" style={{ color:s.accent }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Legend ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:20, alignItems:'center' }}>
        {[{bg:'#e6f7ee',color:'#1a7a45',label:'Normal (<80%)'},{bg:'#fff4e0',color:'#b86000',label:'Chargé (80–99%)'},{bg:'#ffe4e4',color:'#c42b2b',label:'Surchargé (>100%)'}].map(({bg,color,label})=>(
          <div key={label} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#6b7a9e' }}>
            <span style={{ display:'inline-block', width:12, height:12, borderRadius:4, background:bg, border:`1px solid ${color}33` }}/>
            {label}
          </div>
        ))}
        <div style={{ marginLeft:'auto', fontSize:12, color:'#9aa3b8' }}>
          Basé sur <strong>160h</strong>/mois · Cliquez sur un consultant pour voir ses projets
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div style={{ overflowX:'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#9aa3b8', fontSize:14 }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#9aa3b8', fontSize:14 }}>
              {search ? `Aucun résultat pour "${search}"` : 'Aucune donnée — commencez par créer une planification'}
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'auto' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #eef1f8', background:'#f8f9fc' }}>
                  <th style={{ position:'sticky', left:0, zIndex:2, background:'#f8f9fc', textAlign:'left', padding:'14px 20px', fontSize:11, fontWeight:700, color:'#9aa3b8', whiteSpace:'nowrap', borderRight:'1px solid #eef1f8', minWidth:240 }}>CONSULTANT / PROJET</th>
                  {MOIS_LABELS.map(m => (
                    <th key={m} style={{ textAlign:'center', padding:'14px 6px', fontSize:11, fontWeight:700, color:'#9aa3b8', minWidth:68 }}>
                      {m}<br/><span style={{ fontSize:10, fontWeight:400, color:'#bcc4d8' }}>{annee}</span>
                    </th>
                  ))}
                  <th style={{ padding:'14px 12px', fontSize:11, fontWeight:700, color:'#9aa3b8', textAlign:'center', whiteSpace:'nowrap', minWidth:72 }}>TOTAL H</th>
                  <th style={{ padding:'14px 12px', fontSize:11, fontWeight:700, color:'#9aa3b8', textAlign:'center', whiteSpace:'nowrap', minWidth:64 }}>MOY %</th>
                  <th style={{ padding:'14px 12px', fontSize:11, fontWeight:700, color:'#9aa3b8', textAlign:'center', whiteSpace:'nowrap', minWidth:60 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isExpanded = expanded.has(c.consultant_id)
                  const consultantMeta = consultants.find(x => x.id === c.consultant_id)
                  const isInactive = consultantMeta?.statut === 'Inactive'
                  const rowBg = isInactive ? '#fff7ed' : isExpanded ? '#f5f8ff' : 'transparent'
                  return (
                    <>
                      {/* Consultant row */}
                      <tr key={`c-${c.consultant_id}`}
                        onClick={() => toggleExpand(c.consultant_id)}
                        style={{ borderBottom:'1px solid #eef1f8', cursor:'pointer', background: rowBg, borderLeft: isInactive ? '3px solid #f97316' : '3px solid transparent' }}
                        onMouseEnter={e => { if(!isExpanded && !isInactive) e.currentTarget.style.background='#fafbfd' }}
                        onMouseLeave={e => { if(!isExpanded) e.currentTarget.style.background= rowBg }}
                      >
                        <td style={{ position:'sticky', left:0, zIndex:1, background: isInactive ? '#fff7ed' : isExpanded?'#f5f8ff':'#fff', padding:'11px 20px', borderRight:'1px solid #eef1f8' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ color:'#2563eb', flexShrink:0 }}>{isExpanded?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</span>
                            <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:40, height:28, borderRadius:7, background: isInactive ? '#fed7aa' : '#eef2fb', fontFamily:'monospace', fontWeight:700, fontSize:12, color: isInactive ? '#9a3412' : '#162255', flexShrink:0 }}>{c.code}</div>
                            <div>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontSize:13, fontWeight:700, color: isInactive ? '#9a3412' : '#162255' }}>{c.nom}</span>
                                {isInactive && (
                                  <span title="Consultant inactif — planification à revoir" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:'50%', background:'#f97316', color:'#fff', fontSize:10, fontWeight:800, flexShrink:0 }}>!</span>
                                )}
                              </div>
                              <div style={{ fontSize:11, color:'#9aa3b8' }}>
                                {c.division} ·{' '}
                                <span style={{ padding:'1px 6px', borderRadius:4, fontSize:10, fontWeight:600, background:c.seniorite==='SENIOR'?'#dbeafe':c.seniorite==='INTERMEDIATE'?'#fef3c7':'#f1f5f9', color:c.seniorite==='SENIOR'?'#1d4ed8':c.seniorite==='INTERMEDIATE'?'#92400e':'#475569' }}>{c.seniorite}</span>
                                {' · '}{c.projets.length} projet{c.projets.length>1?'s':''}
                              </div>
                            </div>
                          </div>
                        </td>
                        {MOIS_LABELS.map(label => {
                          const cell = c.total_par_mois[label]??{heures:0,pct:0}
                          const val  = display==='pct'?cell.pct:cell.heures
                          return (
                            <td key={label} style={{ padding:'6px 4px', textAlign:'center' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:26, borderRadius:7, ...pctStyle(cell.pct), fontFamily:'monospace', fontSize:12, fontWeight:700 }}>
                                {val===0?'—':display==='pct'?`${val}%`:`${val}h`}
                              </span>
                            </td>
                          )
                        })}
                        <td style={{ padding:'8px 12px', textAlign:'center' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:26, borderRadius:7, background:'#eef2fb', color:'#162255', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>{c.total_heures}h</span>
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'center' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:54, height:26, borderRadius:7, ...pctStyle(c.taux_moyen), fontFamily:'monospace', fontSize:12, fontWeight:700 }}>{c.taux_moyen}%</span>
                        </td>
                        <td />
                      </tr>

                      {/* Project sub-rows */}
                      {isExpanded && c.projets.map((p, pi) => (
                        <React.Fragment key={`p-${p.affectation_id}`}>
                          <tr style={{ borderBottom: expandedProjectWeeks.has(p.affectation_id) ? 'none' : (pi<c.projets.length-1?'1px dashed #f0f2f8':'1px solid #eef1f8'), background:'#fafbff' }}>
                            <td style={{ position:'sticky', left:0, zIndex:1, background:'#fafbff', padding:'8px 20px 8px 60px', borderRight:'1px solid #eef1f8' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:4, height:28, borderRadius:2, background:'#2563eb', flexShrink:0 }}/>
                                <div>
                                  <div style={{ fontSize:13, fontWeight:700, color:'#0033A0', fontFamily:'monospace' }}>{p.projet_code}</div>
                                  <div style={{ fontSize:11, color:'#9aa3b8' }}>{p.projet_nom}</div>
                                </div>
                              </div>
                            </td>
                            {MOIS_LABELS.map(label => {
                              const cell = p.mois[label]??{heures:0,pct:0}
                              const val  = display==='pct'?cell.pct:cell.heures
                              return (
                                <td key={label} style={{ padding:'5px 4px', textAlign:'center' }}>
                                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:24, borderRadius:6, ...pctStyle(cell.pct), fontFamily:'monospace', fontSize:11, fontWeight:600, opacity:cell.pct===0?.4:1 }}>
                                    {val===0?'—':display==='pct'?`${val}%`:`${val}h`}
                                  </span>
                                </td>
                              )
                            })}
                            <td style={{ padding:'5px 12px', textAlign:'center' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:24, borderRadius:6, background:'#eff6ff', color:'#2563eb', fontFamily:'monospace', fontSize:11, fontWeight:600 }}>{p.total_heures}h</span>
                            </td>
                            <td style={{ padding:'5px 12px', textAlign:'center' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:54, height:24, borderRadius:6, ...pctStyle(p.taux_moyen), fontFamily:'monospace', fontSize:11, fontWeight:600 }}>{p.taux_moyen}%</span>
                            </td>
                            {/* Edit + Calendar buttons */}
                            <td style={{ padding:'5px 12px', textAlign:'center' }}>
                              <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    const proj = projetsAll.find(x => x.id === p.projet_id)
                                    setEditTarget({ affectation_id:p.affectation_id, consultant_id:c.consultant_id, projet_id:p.projet_id, nom:c.nom, code:c.code, projet_nom:p.projet_nom, mois:p.mois, q1:proj?.q1??false, q2:proj?.q2??false, q3:proj?.q3??false, q4:proj?.q4??false })
                                  }}
                                  style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', cursor:'pointer', transition:'background .15s' }}
                                  onMouseEnter={e => (e.currentTarget.style.background='#dbeafe')}
                                  onMouseLeave={e => (e.currentTarget.style.background='#eff6ff')}
                                  title="Modifier les heures"
                                >
                                  <Pencil size={13}/>
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); toggleProjectWeeks(p.affectation_id) }}
                                  style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, background: expandedProjectWeeks.has(p.affectation_id) ? '#162B6E' : '#f0f5ff', border:`1px solid ${expandedProjectWeeks.has(p.affectation_id) ? '#162B6E' : '#c7d7fd'}`, color: expandedProjectWeeks.has(p.affectation_id) ? '#fff' : '#4f6ef7', cursor:'pointer', transition:'all .15s' }}
                                  title="Voir les semaines"
                                >
                                  <Calendar size={13}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedProjectWeeks.has(p.affectation_id) && (
                            <tr style={{ borderBottom: pi<c.projets.length-1 ? '1px dashed #f0f2f8' : '1px solid #eef1f8', background:'#f5f8ff' }}>
                              <td colSpan={16} style={{ padding:'0 20px 16px 60px' }}>
                                <InlineWeekEditor
                                  affectationId={p.affectation_id}
                                  annee={annee}
                                  onSaved={() => { toggleProjectWeeks(p.affectation_id); fetchData() }}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid #eef1f8', background:'#f8f9fc' }}>
                  <td style={{ position:'sticky', left:0, zIndex:1, background:'#f8f9fc', padding:'12px 20px', borderRight:'1px solid #eef1f8', fontSize:11, fontWeight:700, color:'#9aa3b8' }}>MOYENNE ÉQUIPE</td>
                  {avgMois.map((avg,i) => {
                    const val = display==='pct'?avg.pct:avg.heures
                    return (
                      <td key={i} style={{ padding:'8px 4px', textAlign:'center' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:26, borderRadius:7, ...pctStyle(avg.pct), fontFamily:'monospace', fontSize:12, fontWeight:700 }}>
                          {val===0?'—':display==='pct'?`${val}%`:`${val}h`}
                        </span>
                      </td>
                    )
                  })}
                  <td style={{ padding:'8px 12px', textAlign:'center' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:60, height:26, borderRadius:7, background:'#eef2fb', color:'#162255', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>
                      {filtered.length?Math.round(filtered.reduce((s,c)=>s+c.total_heures,0)/filtered.length):0}h
                    </span>
                  </td>
                  <td style={{ padding:'8px 12px', textAlign:'center' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:54, height:26, borderRadius:7, background:'#eef2fb', color:'#162255', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>
                      {filtered.length?Math.round(filtered.reduce((s,c)=>s+c.taux_moyen,0)/filtered.length):0}%
                    </span>
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showNew && (
        <NewPlanModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); fetchData() }} />
      )}
      {editTarget && versionId && (
        <EditPlanModal target={editTarget} versionId={versionId} annee={annee} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchData() }} />
      )}
    </div>
  )
}
