export interface ScenarioVersion { id: number; nom: string; est_actuelle?: boolean; assignment_count?: number }
const scenarios = [
  { key: 'optimistic', label: 'Optimiste', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'real', label: 'Réel', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  { key: 'pessimistic', label: 'Pessimiste', color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
  { key: 'optimized', label: 'Optimisé', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'other', label: 'Autres', color: '#4b5563', bg: '#f9fafb', border: '#d1d5db' },
] as const

export function planningScenario(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  if (/^pipeline\b/.test(normalized)) return null
  if (/^(v1\.3\b|optimiste\b)/.test(normalized)) return 'optimistic'
  if (/^(v1\.2\b|reel\b)/.test(normalized)) return 'real'
  if (/^(v1\.1\b|pessimiste\b)/.test(normalized)) return 'pessimistic'
  if (/^optimise\b/.test(normalized)) return 'optimized'
  return 'other'
}

export function groupPlanningVersions<T extends ScenarioVersion>(versions: T[]) {
  return scenarios.map(scenario => ({ ...scenario,
    versions: versions.filter(version => planningScenario(version.nom) === scenario.key)
      .sort((a, b) => Number((b.assignment_count ?? 0) > 0) - Number((a.assignment_count ?? 0) > 0)
        || Number(!/^V1\./i.test(b.nom)) - Number(!/^V1\./i.test(a.nom)) || b.id - a.id),
  })).filter(group => group.versions.length > 0)
}

export function preferredPlanningVersion<T extends ScenarioVersion>(versions: T[], requestedId?: number | null): T | undefined {
  const groups = groupPlanningVersions(versions)
  const requested = versions.find(version => version.id === requestedId)
  if (requested) {
    const group = groups.find(item => item.key === planningScenario(requested.nom))
    if (requested.assignment_count === 0 && group?.versions.some(v => (v.assignment_count ?? 0) > 0)) return group.versions[0]
    if (requested.assignment_count === undefined && /^V1\./i.test(requested.nom)) return group?.versions[0] ?? requested
    return requested
  }
  const populated = versions.filter(version => (version.assignment_count ?? 0) > 0)
  return populated.find(v => v.est_actuelle)
    ?? groups.find(group => group.key === 'optimized')?.versions.find(v => (v.assignment_count ?? 0) > 0)
    ?? populated[0] ?? versions.find(v => v.est_actuelle)
    ?? groups.find(group => group.key === 'optimized')?.versions[0] ?? groups[0]?.versions[0]
}
