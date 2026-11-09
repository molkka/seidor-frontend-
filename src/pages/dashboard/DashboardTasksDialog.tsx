import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useT } from '@/hooks/useT'

interface TaskDetails {
  titre: string
  sousTitre: string
  items: { code: string; nom: string; heures: number; couleur?: string }[]
}

function visibleViewport() {
  const viewport = window.visualViewport
  return { width: viewport?.width ?? innerWidth, height: viewport?.height ?? innerHeight,
    left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0 }
}

export function DashboardTasksDialog({ data, onClose }: { data: TaskDetails; onClose: () => void }) {
  const t = useT()
  const total = data.items.reduce((sum, item) => sum + item.heures, 0)
  const [viewport, setViewport] = useState(visibleViewport)
  const trigger = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)

  useEffect(() => {
    const update = () => setViewport(previous => {
      const next = visibleViewport()
      return Object.keys(next).every(key => next[key as keyof typeof next] === previous[key as keyof typeof previous]) ? previous : next
    })
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])

  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent data-dashboard-task-dialog
      className="flex min-h-0 flex-col gap-0 overflow-hidden rounded-2xl p-0"
      style={{ width: Math.max(0, viewport.width - 16), maxWidth: 560,
        maxHeight: Math.max(0, viewport.height - 16),
        left: viewport.left + viewport.width / 2, top: viewport.top + viewport.height / 2 }}
      onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }) }}>
      <DialogHeader className="min-w-0 shrink-0 border-b border-border p-4 pr-12 text-left">
        <DialogTitle className="min-w-0 break-words text-base leading-snug [overflow-wrap:anywhere]">{data.titre}</DialogTitle>
        <DialogDescription className="min-w-0 break-words text-xs [overflow-wrap:anywhere]">{data.sousTitre}</DialogDescription>
      </DialogHeader>

      <div className="mx-4 mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/10 px-3 py-2">
        <span className="text-sm font-medium text-muted-foreground">{t.common.total} — {t.common.hours}</span>
        <span className="break-all text-xl font-bold text-primary">{total}h</span>
      </div>

      <div data-dashboard-task-list className="min-h-0 min-w-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain p-4">
        {data.items.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t.common.noData}</p> : data.items.map((item, index) => {
          const percentage = total > 0 ? Math.round(item.heures / total * 100) : 0
          return <article data-dashboard-task-row key={index} className="min-w-0 rounded-xl bg-muted/30 p-3">
            <div className="flex min-w-0 items-start gap-2">
              {item.couleur
                ? <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: item.couleur }} />
                : <span className="max-w-16 shrink-0 break-all rounded-lg bg-primary/10 px-2 py-1 font-mono text-[11px] font-bold text-primary">{item.code}</span>}
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{item.nom}</p>
                {item.couleur && <p className="mt-1 break-words font-mono text-[10px] text-muted-foreground [overflow-wrap:anywhere]">{item.code}</p>}
              </div>
              <span className="shrink-0 text-right text-sm font-bold tabular-nums">{item.heures}h</span>
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
              </div>
              <span className="shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{percentage}%</span>
            </div>
          </article>
        })}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <button type="button" onClick={onClose} className="w-full rounded-xl border border-input px-4 py-2 text-sm transition-colors hover:bg-muted">
          {t.common.close}
        </button>
      </div>
    </DialogContent>
  </Dialog>
}
