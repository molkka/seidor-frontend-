import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus } from 'lucide-react'
import { api, describeApiError } from '@/services/api'
import { usePlanningYearStore } from '@/store/planningYearStore'
import { PlanningModalShell } from '@/pages/planning/PlanningModalShell'

interface Source { id: number; nom: string; annee: number; est_actuelle: boolean; total_hours: number; assignment_count: number }
interface Generated { id: number; nom: string; annee: number }
interface Run { run_id: string; state: string; versions: Generated[] }
const storageKey = 'planning-airflow-dashboard-run'
const states: Record<string, string> = { queued: 'En attente Airflow', running: 'Génération en cours', success: 'Plannings générés', failed: 'Échec Airflow : consulter les tâches du DAG avant de relancer.' }
function message(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: { message?: string } } } })?.response?.data?.detail
  return typeof detail?.message === 'string' ? detail.message : describeApiError(error, 'Impossible de joindre Airflow.')
}

export function PlanningAirflowLauncher({ year }: { year: number }) {
  const navigate = useNavigate()
  const setSelectedYear = usePlanningYearStore(s => s.setSelectedYear)
  const [open, setOpen] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [sourceId, setSourceId] = useState(0)
  const [targetYear, setTargetYear] = useState(year + 1)
  const [scenario, setScenario] = useState('all')
  const [margin, setMargin] = useState(20)
  const [reduction, setReduction] = useState(20)
  const [configured, setConfigured] = useState(true)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [run, setRun] = useState<Run | null>(() => {
    try {
      const id = localStorage.getItem(storageKey)
      return id && /^dashboard__[a-f0-9-]{36}$/.test(id) ? { run_id: id, state: 'queued', versions: [] } : null
    } catch { return null }
  })
  const requestId = useRef(crypto.randomUUID())
  const source = sources.find(item => item.id === sourceId)
  const active = run?.state === 'queued' || run?.state === 'running'

  function clearTracking() {
    setRun(null); requestId.current = crypto.randomUUID()
    try { localStorage.removeItem(storageKey) } catch { /* Optional resume. */ }
  }

  useEffect(() => { requestId.current = crypto.randomUUID() }, [sourceId, targetYear, scenario, margin, reduction])

  async function loadSources() {
    setLoading(true); setError('')
    try {
      const response = await api.get('/planning/airflow/sources')
      const list: Source[] = response.data.sources
      setSources(list); setConfigured(response.data.configured)
      const chosen = list.find(s => s.annee === year && s.est_actuelle) ?? list.find(s => s.est_actuelle) ?? list[0]
      if (chosen) { setSourceId(chosen.id); setTargetYear(Math.min(2100, Math.max(year + 1, chosen.annee + 1))) }
    } catch (err) { setError(message(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!run?.run_id || !active) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try {
        const response = await api.get(`/planning/airflow/runs/${run.run_id}`, { timeout: 30000 })
        if (cancelled) return
        setRun(response.data); setError('')
        if (response.data.state !== 'queued' && response.data.state !== 'running') return
      } catch (err) {
        if (cancelled) return
        setError(message(err))
      }
      timer = setTimeout(refresh, 5000)
    }
    void refresh()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [run?.run_id, active])

  async function launch(event: React.FormEvent) {
    event.preventDefault()
    if (!source || targetYear <= source.annee || targetYear > 2100 || busy || active) return
    setBusy(true); setError('')
    try {
      const response = await api.post('/planning/airflow/runs', {
        source_version_id: source.id, target_year: targetYear, scenario,
        pessimistic_increase_percent: margin, optimistic_reduction_percent: reduction, request_id: requestId.current,
      }, { timeout: 30000 })
      setRun(response.data)
      try { localStorage.setItem(storageKey, response.data.run_id) } catch { /* Optional resume. */ }
    } catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); void loadSources() }}
      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
      <CalendarPlus size={18} />Générer un planning
    </button>
    {open && <PlanningModalShell title="Générer un planning avec Airflow"
      subtitle="Utiliser un planning rempli comme modèle pour une année future."
      icon={<CalendarPlus size={18} className="text-white" />} onClose={() => setOpen(false)}>
      <form onSubmit={launch} className="space-y-4 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Airflow génère des versions distinctes à partir des données existantes. Les plannings source sont conservés.</p>
        {loading ? <p role="status">Chargement des sources…</p> : sources.length === 0 ? (error ? null : <p role="status">Aucune version remplie disponible. Importer ou saisir des affectations avant de générer un planning.</p>) : <>
          <label className="grid min-w-0 gap-1 text-sm">Planning source (avec affectations)
            <select value={sourceId} disabled={busy || active} onChange={event => {
              const id = Number(event.target.value); setSourceId(id)
              const selected = sources.find(s => s.id === id)
              if (selected && targetYear <= selected.annee) setTargetYear(Math.min(2100, selected.annee + 1))
            }} className="min-w-0 max-w-full rounded-lg border border-input bg-background p-2">
              {sources.map(s => <option key={s.id} value={s.id}>{s.annee} · {s.nom} · {s.total_hours.toLocaleString('fr-FR')} h</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm">Année à générer
              <input type="number" required min={(source?.annee ?? 2024) + 1} max={2100} step={1} value={targetYear}
                disabled={busy || active} onChange={event => setTargetYear(Number(event.target.value))}
                className="min-w-0 rounded-lg border border-input bg-background p-2" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">Scénarios
              <select value={scenario} disabled={busy || active} onChange={event => setScenario(event.target.value)} className="min-w-0 rounded-lg border border-input bg-background p-2">
                <option value="all">Tous les scénarios</option><option value="optimistic">Optimiste</option><option value="real">Réel</option>
                <option value="pessimistic">Pessimiste</option><option value="optimized">Optimisé</option>
              </select>
            </label>
          </div>
          {(scenario === 'all' || scenario === 'pessimistic') && <label className="grid gap-1 text-sm">Marge pessimiste (%)
            <input type="number" required min={0} max={100} step={1} value={margin} disabled={busy || active}
              onChange={event => setMargin(Number(event.target.value))} className="w-28 rounded-lg border border-input bg-background p-2" />
          </label>}
          {(scenario === 'all' || scenario === 'optimistic') && <label className="grid gap-1 text-sm">Réduction optimiste (%)
            <input type="number" required min={0} max={90} step={1} value={reduction} disabled={busy || active}
              onChange={event => setReduction(Number(event.target.value))} className="w-28 rounded-lg border border-input bg-background p-2" />
          </label>}
          <p className="text-xs text-muted-foreground">Optimiste : heures source − réduction. Réel : 100 % des heures source. Pessimiste : heures source + marge. Optimisé : mêmes heures avec une répartition adaptée aux capacités du calendrier cible. Ce sont des hypothèses d’estimation, pas une prévision apprise ni des heures réalisées.</p>
        </>}
        {!configured && <p role="status" className="text-sm text-amber-800">La connexion Airflow doit être configurée côté serveur.</p>}
        {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
        {run && <div className="space-y-2 rounded-lg border p-3" role="status">
          <p className="font-semibold">{states[run.state] ?? run.state}</p>
          <p className="break-all text-xs text-muted-foreground">{run.run_id}</p>
          {run.versions.map(version => <button type="button" key={version.id} className="block text-left text-sm text-primary underline"
            onClick={() => { setSelectedYear(version.annee); void navigate({ to: '/planning', search: { year: version.annee, version_id: version.id } }) }}>
            Ouvrir {version.nom}
          </button>)}
          {active && <p className="text-xs text-muted-foreground">Suivi automatique toutes les 5 secondes. Vous pouvez fermer cette fenêtre.</p>}
        </div>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={loading || busy || active} onClick={() => void loadSources()} className="rounded-lg border px-3 py-2 text-sm">Actualiser les sources</button>
          {run && <button type="button" onClick={clearTracking} className="rounded-lg border px-3 py-2 text-sm">{active ? 'Arrêter le suivi (le DAG continue)' : 'Nouvelle demande'}</button>}
          <button type="submit" disabled={loading || busy || !!run || !source || !configured || targetYear <= source.annee || targetYear > 2100}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? 'Transmission…' : active ? 'Traitement Airflow…' : 'Lancer dans Airflow'}
          </button>
        </div>
      </form>
    </PlanningModalShell>}
  </>
}
