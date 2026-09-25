import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const profileSchema = z.object({
  nom: z.string().min(2, { message: 'Minimum 2 caractères.' }),
  email: z.email({ error: 'Email invalide.' }),
})

const passwordSchema = z
  .object({
    old_password: z.string().min(1, { message: 'Requis.' }),
    new_password: z.string().min(8, { message: 'Minimum 8 caractères.' }),
    confirm: z.string().min(1, { message: 'Requis.' }),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirm'],
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONSULTANT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export function ProfileForm() {
  const t = useT().settings.profile
  const { user, updateUser } = useAuthStore()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nom: user?.nom ?? '', email: user?.email ?? '' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: '', new_password: '', confirm: '' },
  })

  async function onSaveProfile(values: ProfileValues) {
    setSavingProfile(true)
    try {
      const { data } = await api.put('/auth/me', {
        nom: values.nom,
        email: values.email,
      })
      updateUser({ nom: data.nom, email: data.email })
      toast.success(t.saved)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Erreur lors de la mise à jour.'
      toast.error(msg)
    } finally {
      setSavingProfile(false)
    }
  }

  async function onChangePassword(values: PasswordValues) {
    setSavingPassword(true)
    try {
      await api.put('/auth/me', {
        old_password: values.old_password,
        new_password: values.new_password,
      })
      toast.success(t.passwordUpdated)
      passwordForm.reset()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Erreur lors du changement de mot de passe.'
      toast.error(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  return (
    <div className='space-y-8'>
      {/* ── Identité ── */}
      <Form {...profileForm}>
        <form
          onSubmit={profileForm.handleSubmit(onSaveProfile)}
          className='space-y-4'
        >
          <FormField
            control={profileForm.control}
            name='nom'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.nom}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={profileForm.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.email}</FormLabel>
                <FormControl>
                  <Input type='email' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rôle (lecture seule) */}
          <div className='space-y-1.5'>
            <p className='text-sm font-medium leading-none'>{t.role}</p>
            <Badge
              variant='secondary'
              className={ROLE_COLORS[user.role] ?? ''}
            >
              {user.role}
            </Badge>
          </div>

          {/* Google lié */}
          {user.a_google && (
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <ShieldCheck size={15} className='text-green-500' />
              {t.googleLinked}
            </div>
          )}

          <Button type='submit' disabled={savingProfile}>
            {savingProfile && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {savingProfile ? t.saving : t.save}
          </Button>
        </form>
      </Form>

      <Separator />

      {/* ── Mot de passe ── */}
      <div>
        <h4 className='mb-3 text-sm font-semibold'>{t.passwordTitle}</h4>
        {user.a_google && (
          <p className='mb-3 text-xs text-muted-foreground'>{t.googleOnly}</p>
        )}
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className='space-y-4'
          >
            <FormField
              control={passwordForm.control}
              name='old_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.oldPassword}</FormLabel>
                  <FormControl>
                    <Input type='password' autoComplete='current-password' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name='new_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.newPassword}</FormLabel>
                  <FormControl>
                    <Input type='password' autoComplete='new-password' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name='confirm'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.confirmPassword}</FormLabel>
                  <FormControl>
                    <Input type='password' autoComplete='new-password' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' variant='outline' disabled={savingPassword}>
              {savingPassword && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              {t.updatePassword}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
