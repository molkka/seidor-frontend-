import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, KeyRound, Clock } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function AccountForm() {
  const t = useT().settings.security
  const user = useAuthStore((s) => s.user)
  const [sending, setSending] = useState(false)

  async function handleSendReset() {
    if (!user?.email) return
    setSending(true)
    try {
      await api.post('/auth/forgot-password', { email: user.email })
      toast.success(t.sent)
    } catch {
      toast.error("Erreur lors de l'envoi du lien.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className='space-y-8'>
      {/* ── Réinitialisation mot de passe ── */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <KeyRound size={16} className='text-muted-foreground' />
          <h4 className='text-sm font-semibold'>{t.resetTitle}</h4>
        </div>
        <p className='text-sm text-muted-foreground'>{t.resetDesc}</p>
        <Button variant='outline' onClick={handleSendReset} disabled={sending}>
          {sending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {t.sendLink}
        </Button>
      </div>

      <Separator />

      {/* ── Sessions actives ── */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <Clock size={16} className='text-muted-foreground' />
          <h4 className='text-sm font-semibold'>{t.sessionsTitle}</h4>
        </div>
        <p className='text-sm text-muted-foreground'>{t.sessionsComing}</p>
      </div>
    </div>
  )
}
