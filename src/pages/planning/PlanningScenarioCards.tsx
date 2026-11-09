import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { groupPlanningVersions, type ScenarioVersion } from './planning-scenarios'

export function PlanningScenarioCards({ versions, selected, onChange }: {
  versions: ScenarioVersion[]; selected: number | null; onChange: (id: number) => void
}) {
  const strip = useRef<HTMLDivElement>(null)
  const groups = groupPlanningVersions(versions)
  const index = groups.findIndex(group => group.versions.some(version => version.id === selected))
  function move(next: number) {
    const group = groups[next]
    if (!group) return
    onChange(group.versions[0].id)
    const button = strip.current?.querySelectorAll<HTMLButtonElement>('.planning-version-card')[next]
    button?.focus({ preventScroll: true })
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }
  if (!groups.length) return null
  return <div className="min-w-0 max-w-full flex-1 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-semibold text-muted-foreground">Scénarios de planification</span>
      <div className="flex gap-1">
        <button type="button" aria-label="Scénario précédent" disabled={index <= 0} onClick={() => move(index - 1)} className="rounded border p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Scénario suivant" disabled={index >= groups.length - 1} onClick={() => move(index + 1)} className="rounded border p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>
    </div>
    <div ref={strip} role="group" aria-label="Scénarios de planification" className="flex gap-2 overflow-x-auto pb-2">
      {groups.map((group, groupIndex) => {
        const active = groupIndex === index
        const version = group.versions.find(v => v.id === selected) ?? group.versions[0]
        return <div key={group.key} className="w-48 shrink-0 overflow-hidden rounded-xl border-2"
          style={{ borderColor: active ? group.color : group.border, background: active ? group.bg : '#fff' }}>
          <button type="button" className="planning-version-card flex w-full flex-col gap-1 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
            aria-pressed={active} onClick={() => onChange(group.versions[0].id)}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault(); move(groupIndex + (event.key === 'ArrowLeft' ? -1 : 1))
              }
            }}>
            <span className="text-sm font-bold" style={{ color: group.color }}>{group.label}</span>
            <span className="w-full truncate text-xs text-muted-foreground" title={version.nom}>{version.nom}</span>
            {version.est_actuelle && <span className="text-xs" style={{ color: group.color }}>actuelle</span>}
          </button>
          {group.versions.length > 1 && <div className="border-t px-2 py-2" style={{ borderColor: group.border }}>
            <select aria-label={`Version ${group.label}`} value={version.id} onChange={event => onChange(Number(event.target.value))}
              className="w-full min-w-0 rounded border border-input bg-background px-1 py-1 text-xs">
              {group.versions.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
            </select>
          </div>}
        </div>
      })}
    </div>
  </div>
}
