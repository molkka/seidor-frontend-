import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import './planning-dialog.css'

function viewportBounds() {
  const viewport = window.visualViewport
  return { width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight,
    left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0 }
}

export function PlanningModalShell({ title, subtitle, icon, onClose, children }: {
  title: string; subtitle: string; icon: ReactNode
  onClose: () => void; children: ReactNode
}) {
  const [viewport, setViewport] = useState(viewportBounds)
  useEffect(() => {
    const update = () => setViewport(previous => {
      const next = viewportBounds()
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
    <DialogContent className="planning-dialog"
      style={{ width: Math.max(0, viewport.width - 16), maxWidth: 680, maxHeight: Math.max(0, viewport.height - 16),
        left: viewport.left + viewport.width / 2, top: viewport.top + viewport.height / 2 }}>
      <DialogHeader className="planning-dialog__header shrink-0 border-b border-border px-4 py-4 pr-12 text-left sm:px-6 sm:pr-12">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">{icon}</span>
          <div className="min-w-0">
            <DialogTitle className="break-words text-base leading-snug">{title}</DialogTitle>
            <DialogDescription className="mt-1 break-words text-xs">{subtitle}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="planning-dialog__body">
        {children}
      </div>
    </DialogContent>
  </Dialog>
}
