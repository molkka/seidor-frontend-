import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { describeApiError } from '@/services/api'
import { authApi } from '@/services/authApi'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  email: z.string().email({ message: 'Adresse email invalide.' }),
})

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [mailDown, setMailDown] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const res = await authApi.forgotPassword(data.email)
      // L'API répond 200 même sans SMTP configuré (anti-énumération d'emails).
      // `mail_configured` dit si un email pouvait réellement partir : sans ça on
      // affichait "Email envoyé" alors qu'aucun message n'était jamais émis.
      if (res.data.mail_configured === false) {
        setMailDown(true)
        toast.error("Le service d'envoi d'emails n'est pas configuré sur le serveur.")
        return
      }
      setSent(true)
      toast.success(`Un lien de réinitialisation a été envoyé à ${data.email}`)
      form.reset()
    } catch (err) {
      toast.error(describeApiError(err, 'Une erreur est survenue. Veuillez réessayer.'))
    } finally {
      setIsLoading(false)
    }
  }

  if (mailDown) {
    return (
      <div className='rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900'>
        <p className='font-medium'>Envoi d'email indisponible</p>
        <p className='mt-1'>
          Le serveur n'a pas de configuration SMTP (SMTP_USER / SMTP_PASSWORD).
          Aucun email de réinitialisation ne peut être envoyé pour l'instant —
          contactez un administrateur pour réinitialiser votre mot de passe.
        </p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className='rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800'>
        Email envoyé. Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='vous@seidor.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : null}
          Envoyer le lien
        </Button>
      </form>
    </Form>
  )
}
