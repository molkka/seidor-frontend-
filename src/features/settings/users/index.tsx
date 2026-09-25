import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'
import { api } from '@/services/api'
import { useT } from '@/hooks/useT'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContentSection } from '../components/content-section'
import { type AdminUser, UsersTable } from './users-table'

const createSchema = z.object({
  nom: z.string().min(2, { message: 'Minimum 2 caractères.' }),
  email: z.email({ error: 'Email invalide.' }),
  password: z.string().min(8, { message: 'Minimum 8 caractères.' }),
  role: z.enum(['ADMIN', 'MANAGER']),
})
type CreateValues = z.infer<typeof createSchema>

function CreateUserDialog({
  onCreated,
}: {
  onCreated: (user: AdminUser) => void
}) {
  const t = useT().settings.users
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { nom: '', email: '', password: '', role: 'MANAGER' },
  })

  async function onSubmit(values: CreateValues) {
    setSaving(true)
    try {
      const { data } = await api.post('/auth/users', values)
      onCreated(data as AdminUser)
      toast.success(t.created)
      setOpen(false)
      form.reset()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Erreur lors de la création.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Plus size={15} className='mr-1.5' />
          {t.createBtn}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.createTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
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
              control={form.control}
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
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.password}</FormLabel>
                  <FormControl>
                    <Input type='password' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.role}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='ADMIN'>ADMIN</SelectItem>
                      <SelectItem value='MANAGER'>MANAGER</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' disabled={saving} className='w-full'>
              {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {t.createBtn}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsUsers() {
  const t = useT().settings.users
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/auth/users')
      .then(({ data }) => setUsers(data as AdminUser[]))
      .catch(() => toast.error('Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(user: AdminUser) {
    setUsers((prev) => [...prev, user])
  }

  function handleUpdated(updated: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
  }

  return (
    <ContentSection
      title={t.title}
      desc={t.subtitle}
    >
      <div className='space-y-4'>
        <div className='flex justify-end'>
          <CreateUserDialog onCreated={handleCreated} />
        </div>
        {loading ? (
          <div className='flex justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <UsersTable users={users} onUpdated={handleUpdated} />
        )}
      </div>
    </ContentSection>
  )
}
