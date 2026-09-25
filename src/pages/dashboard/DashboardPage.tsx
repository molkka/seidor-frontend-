// src/pages/dashboard/DashboardPage.tsx
import { useEffect, useState } from 'react'
import { Calendar, Activity, X } from 'lucide-react'
import { YearPicker } from '@/components/year-picker'
import { usePlanningYearStore } from '@/store/planningYearStore'
import { useT } from '@/hooks/useT'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import { api } from '@/services/api'

const MOIS_KEYS  = ['jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec']
const COLORS_PIE = ['#2563eb','#22d3a5','#f59e0b','#ef4444','#8b5cf6','#06b6d4']
const PROJECT_COLORS = [
  '#4f7cff','#22d3a5','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#84cc16','#f97316','#ec4899','#14b8a6',
  '#6366f1','#a855f7','#eab308','#10b981','#3b82f6',
]

interface KpiData {
  total_consultants: number
  consultants_actifs: number
  total_projets: number
  projets_in_progress: number
  projets_pipeline: number
  consultants_surcharges: number
  version_actuelle: string
}

interface UtilMensuelle {
  mois: string
  taux_moyen: number
  taux_max: number
  surcharges: number
}

interface RepartitionItem {
  pays?: string
  type?: string
  count: number
}

interface Affectation {
  id: number
  consultant_id: number
  projet_id: number
  version_id: number
  heures_jan: number; heures_fev: number; heures_mar: number; heures_avr: number
  heures_mai: number; heures_jun: number; heures_jul: number; heures_aou: number
  heures_sep: number; heures_oct: number; heures_nov: number; heures_dec: number
}

interface Consultant {
  id: number
  code: string
  nom_complet: string
  seniorite: string
  division?: string
}

interface Projet {
  id: number
  wbs_code: string
  nom: string
  type?: string
  statut: string
  project_country?: string
}

// ─── Modal Détails ─────────────────────────────────────────────
interface ModalDetail {
  titre: string
  sousTitre: string
  items: {
    code: string
    nom: string
    heures: number
    couleur?: string
  }[]
}

function DetailModal({ data, onClose }: { data: ModalDetail; onClose: () => void }) {
  const total = data.items.reduce((s, i) => s + i.heures, 0)
  const t = useT()
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">{data.titre}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{data.sousTitre}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Total */}
        <div className="mx-5 mt-4 bg-primary/10 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">{t.common.total} — {t.common.hours}</span>
          <span className="text-xl font-bold text-primary">{total}h</span>
        </div>

        {/* Liste */}
        <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.common.noData}</p>
          ) : data.items.map((item, i) => {
            const pct = total > 0 ? Math.round((item.heures / total) * 100) : 0
            return (
              <div key={i}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                {/* Icône */}
                {item.couleur ? (
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: item.couleur }} />
                ) : (
                  <div className="w-9 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold font-mono text-primary">{item.code}</span>
                  </div>
                )}
                {/* Nom */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{item.nom}</div>
                  {item.couleur && (
                    <div className="text-[10px] font-mono text-muted-foreground">{item.code}</div>
                  )}
                </div>
                {/* Barre + heures */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-foreground w-10 text-right">{item.heures}h</span>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-border">
          <button onClick={onClose}
            className="w-full px-4 py-2 text-sm border border-input rounded-xl hover:bg-muted transition-colors">
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── KPI Card — SEIDOR style ───────────────────────────────────
function KpiCard({ title, value, sub, accent }: {
  title: string, value: string | number, sub: string, accent: string
}) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-200 border-l-4"
      style={{ borderLeftColor: accent }}
    >
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        {title}
      </p>
      <p className="text-4xl font-extrabold text-foreground leading-none mb-2" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

// ─── Vue Calendrier ────────────────────────────────────────────
function CalendrierView({ affectations, consultants, projets, annee }: {
  affectations: Affectation[]
  consultants: Consultant[]
  projets: Projet[]
  annee: number
}) {
  const [filterConsultant, setFilterConsultant] = useState('ALL')
  const [viewMode, setViewMode] = useState<'consultant' | 'projet'>('consultant')
  const [modal, setModal] = useState<ModalDetail | null>(null)
  const t = useT()
  const MOIS = t.months.short

  const getProjet      = (id: number) => projets.find(p => p.id === id)
  const getConsultant  = (id: number) => consultants.find(c => c.id === id)
  const getHeures      = (aff: Affectation, mois: string): number =>
    (aff as any)[`heures_${mois}`] || 0

  const projetColorMap: Record<number, string> = {}
  projets.forEach((p, i) => { projetColorMap[p.id] = PROJECT_COLORS[i % PROJECT_COLORS.length] })

  const affFiltered = affectations.filter(a =>
    filterConsultant === 'ALL' || a.consultant_id === Number(filterConsultant)
  )

  const getTotalMois = (mois: string): number =>
    affFiltered.reduce((s, a) => s + getHeures(a, mois), 0)

  // Lignes consultants
  const consultantRows = consultants
    .filter(c => filterConsultant === 'ALL' || c.id === Number(filterConsultant))
    .map(c => ({ consultant: c, affectations: affectations.filter(a => a.consultant_id === c.id) }))
    .filter(r => r.affectations.length > 0)

  return (
    <>
      {modal && <DetailModal data={modal} onClose={() => setModal(null)} />}

      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Calendrier Planning {annee}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Cliquez sur une cellule pour voir les détails
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-input overflow-hidden text-xs">
              {[
                { v: 'consultant', l: '👤 Par consultant' },
                { v: 'projet',     l: '📁 Par projet' },
              ].map(opt => (
                <button key={opt.v}
                  onClick={() => setViewMode(opt.v as any)}
                  className={`px-3 py-2 font-medium transition-colors ${
                    viewMode === opt.v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
            <select
              value={filterConsultant}
              onChange={e => setFilterConsultant(e.target.value)}
              className="px-3 py-2 bg-background border border-input rounded-lg text-xs focus:outline-none"
            >
              <option value="ALL">Tous les consultants</option>
              {consultants.map(c => (
                <option key={c.id} value={c.id}>{c.code} — {c.nom_complet}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Légende */}
        <div className="flex gap-4 flex-wrap">
          {[
            { bg: '#dcfce7', border: '#16a34a', label: 'Heures planifiées' },
            { bg: '#fef9c3', border: '#ca8a04', label: 'Charge élevée (>120h)' },
            { bg: '#fee2e2', border: '#dc2626', label: 'Surcharge (>160h)' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm inline-block border"
                style={{ background: l.bg, borderColor: l.border }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '1000px' }}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="sticky left-0 bg-muted/40 text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[180px] border-r border-border z-10">
                    {viewMode === 'consultant' ? 'Consultant' : 'Projet'}
                  </th>
                  {MOIS.map((m, i) => (
                    <th key={m} className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground uppercase min-w-[85px]">
                      <div>{m}</div>
                      <div className="text-[10px] font-normal text-muted-foreground/60 mt-0.5">
                        {Math.round(getTotalMois(MOIS_KEYS[i]))}h
                      </div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase min-w-[70px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {viewMode === 'consultant' ? (
                  // ── Vue par consultant ────────────────────────────────
                  consultantRows.map(({ consultant, affectations: affC }, rowIdx) => {
                    const totalAnnee = MOIS_KEYS.reduce((sum, m) =>
                      sum + affC.reduce((s, a) => s + getHeures(a, m), 0), 0)
                    return (
                      <tr key={consultant.id}
                        className={`border-b border-border/50 hover:bg-muted/10 transition-colors ${rowIdx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                        {/* Nom */}
                        <td className="sticky left-0 bg-card px-4 py-2 border-r border-border z-10">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                              {consultant.code}
                            </span>
                            <div>
                              <div className="text-xs font-medium text-foreground">{consultant.nom_complet}</div>
                              <div className="text-[10px] text-muted-foreground">{consultant.division}</div>
                            </div>
                          </div>
                        </td>
                        {/* Cellules mois */}
                        {MOIS_KEYS.map((mois, mi) => {
                          const totalH = affC.reduce((s, a) => s + getHeures(a, mois), 0)
                          const projetsActifs = affC
                            .filter(a => getHeures(a, mois) > 0)
                            .map(a => ({ projet: getProjet(a.projet_id), heures: getHeures(a, mois) }))
                            .filter(x => x.projet)

                          let cellBg = 'transparent'
                          if (totalH > 160) cellBg = '#fee2e2'
                          else if (totalH > 120) cellBg = '#fef9c3'
                          else if (totalH > 0) cellBg = '#dcfce7'

                          return (
                            <td key={mois} className="px-1 py-1 text-center align-top">
                              {totalH > 0 ? (
                                <div
                                  className="rounded-lg p-1.5 cursor-pointer hover:ring-2 hover:ring-primary/40 hover:shadow-sm transition-all"
                                  style={{ background: cellBg }}
                                  onClick={() => setModal({
                                    titre: `${consultant.code} — ${MOIS[mi]}`,
                                    sousTitre: `${consultant.nom_complet} · ${Math.round(totalH)}h planifiées`,
                                    items: projetsActifs.map(({ projet, heures }) => ({
                                      code: projet!.wbs_code,
                                      nom: projet!.nom,
                                      heures: Math.round(heures),
                                      couleur: projetColorMap[projet!.id],
                                    }))
                                  })}
                                >
                                  <div className={`text-xs font-bold ${
                                    totalH > 160 ? 'text-red-700' : totalH > 120 ? 'text-yellow-700' : 'text-green-700'
                                  }`}>
                                    {Math.round(totalH)}h
                                  </div>
                                  <div className="mt-1 space-y-0.5">
                                    {projetsActifs.slice(0, 3).map(({ projet, heures }) => (
                                      <div key={projet!.id}
                                        className="flex items-center gap-1 text-[9px]">
                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                          style={{ background: projetColorMap[projet!.id] }} />
                                        <span className="truncate text-muted-foreground max-w-[50px]"
                                          title={projet!.nom}>
                                          {projet!.nom.slice(0, 10)}
                                        </span>
                                        <span className="font-semibold ml-auto">{Math.round(heures)}h</span>
                                      </div>
                                    ))}
                                    {projetsActifs.length > 3 && (
                                      <div className="text-[9px] text-muted-foreground text-center">
                                        +{projetsActifs.length - 3} autres
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/30 text-xs">—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center">
                          <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-lg">
                            {Math.round(totalAnnee)}h
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  // ── Vue par projet ────────────────────────────────────
                  projets
                    .filter(p => affectations.some(a => a.projet_id === p.id))
                    .map((projet, rowIdx) => {
                      const affP = affectations.filter(a => a.projet_id === projet.id)
                      const totalAnnee = MOIS_KEYS.reduce((sum, m) =>
                        sum + affP.reduce((s, a) => s + getHeures(a, m), 0), 0)

                      return (
                        <tr key={projet.id}
                          className={`border-b border-border/50 hover:bg-muted/10 transition-colors ${rowIdx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                          {/* Nom projet */}
                          <td className="sticky left-0 bg-card px-4 py-2 border-r border-border z-10">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-8 rounded-full flex-shrink-0"
                                style={{ background: projetColorMap[projet.id] }} />
                              <div>
                                <div className="text-xs font-semibold text-foreground truncate max-w-[130px]"
                                  title={projet.nom}>
                                  {projet.nom}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {projet.wbs_code}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Cellules mois */}
                          {MOIS_KEYS.map((mois, mi) => {
                            const totalH = affP.reduce((s, a) => s + getHeures(a, mois), 0)
                            const consActifs = affP
                              .filter(a => getHeures(a, mois) > 0)
                              .map(a => ({ cons: getConsultant(a.consultant_id), h: getHeures(a, mois) }))
                              .filter(x => x.cons)

                            let cellBg = 'transparent'
                            if (totalH > 160) cellBg = '#fee2e2'
                            else if (totalH > 80) cellBg = '#fef9c3'
                            else if (totalH > 0) cellBg = '#dcfce7'

                            return (
                              <td key={mois} className="px-1 py-1 text-center align-top">
                                {totalH > 0 ? (
                                  <div
                                    className="rounded-lg p-1.5 cursor-pointer hover:ring-2 hover:ring-primary/40 hover:shadow-sm transition-all"
                                    style={{ background: cellBg }}
                                    onClick={() => setModal({
                                      titre: `${projet.nom} — ${MOIS[mi]}`,
                                      sousTitre: `${projet.wbs_code} · ${Math.round(totalH)}h planifiées`,
                                      items: consActifs.map(({ cons, h }) => ({
                                        code: cons!.code,
                                        nom: cons!.nom_complet,
                                        heures: Math.round(h),
                                      }))
                                    })}
                                  >
                                    <div className={`text-xs font-bold ${
                                      totalH > 160 ? 'text-red-700' : totalH > 80 ? 'text-yellow-700' : 'text-green-700'
                                    }`}>
                                      {Math.round(totalH)}h
                                    </div>
                                    <div className="mt-1 space-y-0.5">
                                      {consActifs.slice(0, 3).map(({ cons, h }) => (
                                        <div key={cons!.id}
                                          className="flex items-center gap-1 text-[9px]">
                                          <span className="font-mono font-bold text-primary">{cons!.code}</span>
                                          <span className="text-muted-foreground ml-auto">{Math.round(h)}h</span>
                                        </div>
                                      ))}
                                      {consActifs.length > 3 && (
                                        <div className="text-[9px] text-muted-foreground text-center">
                                          +{consActifs.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/30 text-xs">—</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-lg">
                              {Math.round(totalAnnee)}h
                            </span>
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
              {/* Footer totaux */}
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="sticky left-0 bg-muted/30 px-4 py-3 border-r border-border z-10">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Total mensuel
                    </span>
                  </td>
                  {MOIS_KEYS.map((mois, mi) => {
                    const total = affFiltered.reduce((s, a) => s + getHeures(a, mois), 0)
                    return (
                      <td key={mois} className="px-2 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          total > 1000 ? 'bg-red-100 text-red-700' :
                          total > 500  ? 'bg-yellow-100 text-yellow-700' :
                          total > 0    ? 'bg-green-100 text-green-700' :
                          'text-muted-foreground'
                        }`}>
                          {total > 0 ? `${Math.round(total)}h` : '—'}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                      {Math.round(
                        affFiltered.reduce((s, a) =>
                          s + MOIS_KEYS.reduce((ss, m) => ss + getHeures(a, m), 0), 0)
                      )}h
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Dashboard principal ───────────────────────────────────────
export default function DashboardPage() {
  const { selectedYear, setSelectedYear } = usePlanningYearStore()
  const [kpi, setKpi]                     = useState<KpiData | null>(null)
  const [utilMensuelle, setUtilMensuelle] = useState<UtilMensuelle[]>([])
  const [repartPays, setRepartPays]       = useState<RepartitionItem[]>([])
  const [repartType, setRepartType]       = useState<RepartitionItem[]>([])
  const [affectations, setAffectations]   = useState<Affectation[]>([])
  const [consultants, setConsultants]     = useState<Consultant[]>([])
  const [projets, setProjets]             = useState<Projet[]>([])
  const [loading, setLoading]             = useState(true)
  const annee                             = selectedYear ?? new Date().getFullYear()
  const [loadingAff, setLoadingAff]       = useState(false)
  const t = useT()

  useEffect(() => {
    async function load() {
      try {
        const [kpiRes, utilRes, paysRes, typeRes, affRes, consRes, projRes] = await Promise.all([
          api.get(`/dashboard/kpi?annee=${annee}`),
          api.get(`/dashboard/utilisation-mensuelle?annee=${annee}`),
          api.get('/dashboard/repartition-pays'),
          api.get('/dashboard/repartition-type'),
          api.get(`/planning?annee=${annee}`),
          api.get('/consultants'),
          api.get('/projets'),
        ])
        setKpi(kpiRes.data)
        setUtilMensuelle(utilRes.data)
        setRepartPays(paysRes.data)
        setRepartType(typeRes.data)
        setAffectations(affRes.data)
        setConsultants(consRes.data)
        setProjets(projRes.data)
      } catch (err) {
        console.error('Dashboard API error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleAnneeChange(y: number) {
    setSelectedYear(y)
    setLoadingAff(true)
    Promise.all([
      api.get(`/dashboard/kpi?annee=${y}`),
      api.get(`/dashboard/utilisation-mensuelle?annee=${y}`),
      api.get(`/planning?annee=${y}`),
    ])
      .then(([kpiRes, utilRes, affRes]) => {
        setKpi(kpiRes.data)
        setUtilMensuelle(utilRes.data)
        setAffectations(affRes.data)
      })
      .catch(() => {})
      .finally(() => setLoadingAff(false))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground animate-pulse">{t.dashboard.loading}</div>
      </div>
    )
  }

  const avgTaux = utilMensuelle.length > 0
    ? Math.round(utilMensuelle.reduce((s, m) => s + m.taux_moyen, 0) / utilMensuelle.length)
    : 0

  return (
    <div className="space-y-6">

      {/* Header — SEIDOR style */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <div className="w-1 h-10 rounded-full bg-primary" />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Dashboard</h2>
              <span style={{ background:'#eff6ff', color:'#2563eb', fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:6, letterSpacing:'.04em' }}>{annee}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Planning SAP Africa · Version {kpi?.version_actuelle ?? 'V1.3'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#6b7280' }}>Année :</span>
            <YearPicker value={annee} onChange={handleAnneeChange} />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-full">
            <Activity size={12} />
            {loadingAff ? 'Chargement...' : 'Données en temps réel'}
          </div>
        </div>
      </div>

      {/* KPIs — SEIDOR large-number style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t.dashboard.kpi.activeConsultants}
          value={`+${kpi?.consultants_actifs ?? 0}`}
          sub={`${t.common.total} ${kpi?.total_consultants ?? 0}`}
          accent="#2563eb" />
        <KpiCard title={t.dashboard.kpi.inProgress}
          value={`+${kpi?.projets_in_progress ?? 0}`}
          sub={`${kpi?.projets_pipeline ?? 0} ${t.dashboard.kpi.pipeline}`}
          accent="#10b981" />
        <KpiCard title={t.dashboard.charts.avgRate}
          value={`${avgTaux}%`}
          sub={`${annee}`}
          accent="#8b5cf6" />
        <KpiCard title={t.dashboard.kpi.overloaded}
          value={kpi?.consultants_surcharges ?? 0}
          sub="Taux > 100% / 1+ mois"
          accent="#ef4444" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Taux utilisation mensuel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t.dashboard.charts.monthlyUtil}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={utilMensuelle} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} domain={[0, 110]} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: any) => [`${v}%`, 'Taux moyen']}
              />
              <Bar dataKey="taux_moyen" fill="#2563eb" radius={[4,4,0,0]} name="Taux moyen" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par type */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.charts.projectType}</h3>
          {repartType.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={repartType} dataKey="count" nameKey="type"
                    cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                    {repartType.map((_, i) => (
                      <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {repartType.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full"
                        style={{ background: COLORS_PIE[i % COLORS_PIE.length] }} />
                      <span className="text-muted-foreground">{item.type}</span>
                    </div>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Aucune donnée</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Consultants surchargés par mois */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Consultants surchargés par mois</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={utilMensuelle}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="surcharges" stroke="#ef4444"
                strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} name="Surchargés" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par pays */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Projets actifs par pays</h3>
          {repartPays.length > 0 ? (
            <div className="space-y-2.5">
              {repartPays.map((item, i) => {
                const max = Math.max(...repartPays.map(r => r.count))
                const pct = Math.round((item.count / max) * 100)
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.pays}</span>
                      <span className="font-semibold text-foreground">{item.count} projets</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: COLORS_PIE[i % COLORS_PIE.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* ─── VUE CALENDRIER ─── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <CalendrierView
          affectations={affectations}
          consultants={consultants}
          projets={projets}
          annee={annee}
        />
      </div>

    </div>
  )
}