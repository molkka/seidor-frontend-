import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldAlert } from 'lucide-react'
import { api } from '@/services/api'
import { useT } from '@/hooks/useT'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PROTECTED_EMAIL = 'molka.missaoui@esprit.tn'

export interface AdminUser {
  id: number
  nom: string
  email: string
  role: string
  est_actif: boolean
  a_google: boolean
}

interface UsersTableProps {
  users: AdminUser[]
  onUpdated: (user: AdminUser) => void
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONSULTANT:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export function UsersTable({ users, onUpdated }: UsersTableProps) {
  const t = useT().settings.users
  const [loadingId, setLoadingId] = useState<number | null>(null)

  async function patchUser(
    id: number,
    patch: { role?: string; est_actif?: boolean }
  ) {
    setLoadingId(id)
    try {
      const { data } = await api.put(`/auth/users/${id}`, patch)
      onUpdated(data as AdminUser)
      toast.success(t.updated)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Erreur lors de la mise à jour.'
      toast.error(msg)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className='overflow-x-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.nom}</TableHead>
            <TableHead>{t.email}</TableHead>
            <TableHead>{t.role}</TableHead>
            <TableHead>{t.actif}</TableHead>
            <TableHead className='text-right'>{t.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isProtected =
              u.email.toLowerCase() === PROTECTED_EMAIL.toLowerCase()
            const busy = loadingId === u.id
            return (
              <TableRow key={u.id}>
                <TableCell className='font-medium'>{u.nom}</TableCell>
                <TableCell className='text-sm text-muted-foreground'>
                  <div className='flex items-center gap-1.5'>
                    {u.email}
                    {isProtected && (
                      <ShieldAlert
                        size={13}
                        className='text-amber-500'
                        title={t.protected}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {isProtected ? (
                    <Badge
                      variant='secondary'
                      className={ROLE_BADGE[u.role] ?? ''}
                    >
                      {u.role}
                    </Badge>
                  ) : (
                    <Select
                      value={u.role}
                      onValueChange={(role) => patchUser(u.id, { role })}
                      disabled={busy}
                    >
                      <SelectTrigger className='h-7 w-28 text-xs'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ADMIN'>ADMIN</SelectItem>
                        <SelectItem value='MANAGER'>MANAGER</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={u.est_actif ? 'default' : 'secondary'}
                    className={
                      u.est_actif
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : ''
                    }
                  >
                    {u.est_actif ? t.yes : t.no}
                  </Badge>
                </TableCell>
                <TableCell className='text-right'>
                  {isProtected ? (
                    <span className='text-xs text-muted-foreground'>
                      {t.protected}
                    </span>
                  ) : (
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={busy}
                      onClick={() =>
                        patchUser(u.id, { est_actif: !u.est_actif })
                      }
                    >
                      {busy && (
                        <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                      )}
                      {u.est_actif ? t.deactivate : t.activate}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
