import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { PasswordInput } from '@/components/password-input'

const formSchema = z
  .object({
    new_password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirm_password'],
  })

interface ResetPasswordFormProps {
  token?: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const navigate = useNavigate()
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }
    authApi
      .verifyResetToken(token)
      .then((res) => setTokenValid(res.data.valid))
      .catch(() => setTokenValid(false))
  }, [token])

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!token) return
    setIsLoading(true)
    try {
      await authApi.resetPassword(token, data.new_password)
      toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.')
      navigate({ to: '/login' })
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Lien invalide ou expiré.'
      toast.error(detail)
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <p className='text-sm text-muted-foreground'>Vérification du lien...</p>
    )
  }

  if (!tokenValid) {
    return (
      <p className='text-sm text-destructive'>
        Ce lien est invalide ou a expiré. Veuillez faire une{' '}
        <a href='/forgot-password' className='underline'>
          nouvelle demande
        </a>
        .
      </p>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='grid gap-4'
      >
        <FormField
          control={form.control}
          name='new_password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nouveau mot de passe</FormLabel>
              <FormControl>
                <PasswordInput placeholder='••••••••' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirm_password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmer le mot de passe</FormLabel>
              <FormControl>
                <PasswordInput placeholder='••••••••' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : null}
          Réinitialiser le mot de passe
        </Button>
      </form>
    </Form>
  )
}
