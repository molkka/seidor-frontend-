import { lazy, Suspense, useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useI18nStore } from '@/store/i18nStore'

const ChatbotPage = lazy(() => import('@/pages/chatbot/ChatbotPage'))

export function PlanningAssistant() {
  const [open, setOpen] = useState(false)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 }))
  useEffect(() => {
    const update = () => {
      const v = window.visualViewport
      setViewport({ width: v?.width ?? window.innerWidth, height: v?.height ?? window.innerHeight,
        left: v?.offsetLeft ?? 0, top: v?.offsetTop ?? 0 })
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])
  const lang = useI18nStore(s => s.lang)
  const label = lang === 'fr' ? 'Assistant de planification' : 'Planning assistant'
  const description = lang === 'fr'
    ? 'Posez vos questions sur votre planification.'
    : 'Ask questions about your planning.'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Bot size={22} aria-hidden="true" />
          <span className="hidden sm:inline">Assistant</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="flex flex-col gap-0 overflow-hidden p-0"
        style={{
          top: viewport.top + Math.max(8, viewport.height - 680),
          left: viewport.left + Math.max(8, viewport.width - 488),
          right: 'auto', bottom: 'auto', transform: 'none', translate: 'none',
          width: Math.max(0, Math.min(480, viewport.width - 16)), maxWidth: 'none',
          height: Math.max(0, Math.min(672, viewport.height - 16)),
        }}
      >
        <header className="shrink-0 border-b px-4 py-3 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base"><Bot size={20} />{label}</DialogTitle>
          <DialogDescription className="mt-1 text-xs">{description}</DialogDescription>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-3">
          <Suspense fallback={<p role="status">{lang === 'fr' ? 'Chargement…' : 'Loading…'}</p>}>
            <ChatbotPage embedded />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  )
}
