import { useEffect, useState } from 'react'
import { Can } from '@/components/permission'
import { api, describeApiError } from '@/services/api'

interface Version { id: number; nom: string; annee: number; est_actuelle: boolean }
interface Person { id: number; name: string }
interface Metrics {
  total_hours: number; overload_hours: number; overloaded_consultants: number
  consultants: Person[]
}
interface Report {
  scenario?: 'optimized' | 'real' | 'pessimistic' | 'optimistic'; effort_factor?: number
  pessimistic_increase_percent?: number; optimistic_reduction_percent?: number; source_total_hours?: number
  source_version_id: number; source_year: number; target_year: number; fingerprint: string
  before: Metrics; after: Metrics; transferred_hours: number
  transfers: { from_id: number; to_id: number; project_id: number; month: number; hours: number; reason: string }[]
  excluded_assignment_ids: number[]; calendar_basis: string
}
const number = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
const reasons: Record<string, string> = {
  same_project: 'Même projet', same_client: 'Même client', compatible_module: 'Module SAP compatible',
}

export function PlanningOptimizationPanel({ sourceVersion, projects, onCreated }: {
  sourceVersion: Version | undefined
  projects: { id: number; nom: string }[]
  onCreated: (version: Version) => void
}) {
  const [report, setReport] = useState<Report | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [scenario, setScenario] = useState<'optimized' | 'real' | 'pessimistic' | 'optimistic'>('optimized')
  const [margin, setMargin] = useState(20)
  const [reduction, setReduction] = useState(20)
  const [projectionSource, setProjectionSource] = useState<{ id: number; year: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    setReport(null); setSaved(false); setError(''); setShowAll(false)
    setBusy(false)
    setProjectionSource(sourceVersion ? { id: sourceVersion.id, year: sourceVersion.annee } : null)
    if (sourceVersion && /^(Optimisé|Réel|Pessimiste|Optimiste) \d{4}/.test(sourceVersion.nom)) {
      setBusy(true)
      api.get(`/planning/optimization/versions/${sourceVersion.id}`).then(response => {
        if (!cancelled) {
          const loaded: Report = response.data.report
          setReport(loaded); setSaved(true)
          setScenario(loaded.scenario ?? 'optimized')
          setReduction(loaded.optimistic_reduction_percent ?? 20)
          setMargin(loaded.scenario === 'pessimistic' ? loaded.pessimistic_increase_percent ?? 20 : 20)
          setProjectionSource({ id: loaded.source_version_id, year: loaded.source_year })
        }
      }).catch(err => {
        if (!cancelled) setError(describeApiError(err, 'Impossible de charger le rapport.'))
      }).finally(() => { if (!cancelled) setBusy(false) })
    }
    return () => { cancelled = true }
  }, [sourceVersion?.id, sourceVersion?.nom])

  async function preview(generate = false) {
    if (!projectionSource) return
    setBusy(true); setError(''); setReport(null); setSaved(false)
    try {
      const response = await api.post('/planning/optimization/preview', {
        source_version_id: projectionSource.id, target_year: projectionSource.year + 1,
        scenario, pessimistic_increase_percent: margin, optimistic_reduction_percent: reduction,
      }, { timeout: 120000 })
      setReport(response.data)
      if (generate) await saveProposal(response.data)
    } catch (err) { setError(describeApiError(err, generate ? 'Impossible de générer et enregistrer le planning.' : 'Impossible de préparer la proposition.')) }
    finally { setBusy(false) }
  }

  async function saveProposal(proposal: Report) {
      const response = await api.post('/planning/optimization/create', {
        source_version_id: proposal.source_version_id, target_year: proposal.target_year,
        expected_fingerprint: proposal.fingerprint,
        scenario: proposal.scenario ?? 'optimized',
        pessimistic_increase_percent: proposal.pessimistic_increase_percent ?? 20,
        optimistic_reduction_percent: proposal.optimistic_reduction_percent ?? 20,
      }, { timeout: 120000 })
      const versions = await api.get(`/planning/versions?annee=${proposal.target_year}`)
      const version = (versions.data as Version[]).find(v => v.id === response.data.target_version_id)
      if (!version) throw new Error('Version créée mais non disponible dans la liste.')
      setSaved(true)
      onCreated(version)
  }

  async function create() {
    if (!report) return
    setBusy(true); setError('')
    try {
      await saveProposal(report)
    } catch (err) { setError(describeApiError(err, 'Impossible de créer la version.')) }
    finally { setBusy(false) }
  }

  if (!sourceVersion) return null
  const names = new Map(report?.before.consultants.map(person => [person.id, person.name]))
  const moves = report?.transfers ?? []
  return <section className="rounded-xl border border-border bg-card p-5 space-y-4" aria-label="Optimisation de la planification">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="font-bold text-foreground">Répartition de l’équipe · proposition annuelle</h3>
        <p className="text-sm text-muted-foreground mt-1">Créer un planning optimiste, réel, pessimiste ou optimisé à partir de la version sélectionnée.</p>
      </div>
      <Can permission="planning:write"><div className="flex flex-wrap gap-2">
      <button disabled={busy || !projectionSource || projectionSource.year >= 2100} onClick={() => preview(false)}
        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Prévisualiser</button>
      <button disabled={busy || !projectionSource || projectionSource.year >= 2100} onClick={() => preview(true)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? 'Génération en cours…' : `Générer ${scenario === 'optimistic' ? 'Optimiste' : scenario === 'pessimistic' ? 'Pessimiste' : scenario === 'real' ? 'Réel' : 'Optimisé'} ${(projectionSource?.year ?? sourceVersion.annee) + 1}`}
      </button></div></Can>
    </div>
    <Can permission="planning:write"><div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-0 max-w-full gap-1 text-sm">Modèle de planification
        <select value={scenario} disabled={busy} onChange={event => {
          setScenario(event.target.value as typeof scenario); setReport(null); setSaved(false)
        }} className="min-w-0 max-w-full rounded-lg border border-input bg-background px-3 py-2">
          <option value="optimized">Optimisé · mêmes heures, répartition améliorée</option>
          <option value="real">Réel · 100 % des heures source</option>
          <option value="optimistic">Optimiste · réduction des heures source</option>
          <option value="pessimistic">Pessimiste · marge sur les heures source</option>
        </select>
      </label>
      {scenario === 'pessimistic' && <label className="grid gap-1 text-sm">Marge pessimiste (%)
        <input type="number" min={0} max={100} step={1} value={margin} disabled={busy}
          onChange={event => { setMargin(Math.min(100, Math.max(0, Math.round(Number(event.target.value))))); setReport(null); setSaved(false) }}
          className="w-28 rounded-lg border border-input bg-background px-3 py-2" />
      </label>}
      {scenario === 'optimistic' && <label className="grid gap-1 text-sm">Réduction optimiste (%)
        <input type="number" min={0} max={90} step={1} value={reduction} disabled={busy}
          onChange={event => { setReduction(Math.min(90, Math.max(0, Math.round(Number(event.target.value))))); setReport(null); setSaved(false) }}
          className="w-28 rounded-lg border border-input bg-background px-3 py-2" />
      </label>}
      <p className="text-xs text-muted-foreground">Réel est une estimation reconduite, pas des heures réalisées. Optimiste réduit l’effort selon votre hypothèse. Les scénarios optimiste, réel et pessimiste conservent les affectations source.</p>
      {projectionSource && <p className="text-xs text-muted-foreground">Base de calcul : version #{projectionSource.id} · {projectionSource.year} → {projectionSource.year + 1}.</p>}
    </div></Can>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {report && <>
      <p className="text-sm text-muted-foreground">Base {report.source_year} → proposition {report.target_year} · {report.scenario === 'optimistic' ? 'Optimiste' : report.scenario === 'pessimistic' ? 'Pessimiste' : report.scenario === 'real' ? 'Réel' : 'Optimisé'}.
        {' '}Effort source : {number(report.source_total_hours ?? report.before.total_hours)} h × {report.effort_factor ?? 1} = {number(report.after.total_hours)} h.
        {' '}Le travail est reconduit aux mêmes mois ; vérifiez le périmètre et les échéances.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Heures à répartir', `${number(report.after.total_hours)} h`],
          ['Surcharge avant → après', `${number(report.before.overload_hours)} → ${number(report.after.overload_hours)} h`],
          ['Consultants surchargés', `${report.before.overloaded_consultants} → ${report.after.overloaded_consultants}`],
          ['Heures réaffectées', `${number(report.transferred_hours)} h`],
        ].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p>
        </div>)}
      </div>
      <p className="text-xs text-muted-foreground">Comparaison avant/après sur le même calendrier {report.target_year}, avec dates de disponibilité. {report.excluded_assignment_ids.length} affectation(s) de projets terminés ou en pause exclue(s). Rapport initial enregistré à la création ; les modifications ultérieures du planning ne recalculent pas ce rapport.</p>
      {report.after.overload_hours > 0 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{number(report.after.overload_hours)} h restent au-delà de la capacité des consultants éligibles. Revoir les délais, le périmètre, les disponibilités ou le recrutement.</p>}
      {report.calendar_basis !== 'existing_calendar' && <p className="text-sm text-amber-800">Calendrier généré : vérifiez les jours fériés avant validation.</p>}
      {moves.length > 0 && <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="text-left text-xs text-muted-foreground pb-2">Réaffectations proposées ({moves.length})</caption>
          <thead><tr>{['Mois', 'Projet', 'De', 'Vers', 'Heures', 'Motif'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead>
          <tbody>{(showAll ? moves : moves.slice(0, 8)).map((move, index) => <tr className="border-t border-border" key={index}>
            <td className="p-2">{move.month}</td><td className="p-2">{projects.find(p => p.id === move.project_id)?.nom ?? `#${move.project_id}`}</td>
            <td className="p-2">{names.get(move.from_id) ?? `#${move.from_id}`}</td><td className="p-2">{names.get(move.to_id) ?? `#${move.to_id}`}</td>
            <td className="p-2">{number(move.hours)}</td><td className="p-2">{reasons[move.reason] ?? move.reason}</td>
          </tr>)}</tbody>
        </table>
        {moves.length > 8 && <button onClick={() => setShowAll(!showAll)} className="mt-2 text-sm text-primary underline">{showAll ? 'Réduire la liste' : 'Voir toutes les réaffectations'}</button>}
      </div>}
      {!saved && <Can permission="planning:write"><button disabled={busy} onClick={create}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Créer la version proposée {report.target_year}</button></Can>}
      {saved && <p className="text-sm text-green-800">Proposition enregistrée dans une version distincte. La version source est conservée.</p>}
    </>}
  </section>
}
