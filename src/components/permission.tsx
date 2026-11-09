import type { InputHTMLAttributes, ReactNode } from 'react'
import { useCan } from '@/hooks/use-can'


export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  return useCan(permission) ? <>{children}</> : null
}

export function PermissionInput({ permission, disabled, ...props }: InputHTMLAttributes<HTMLInputElement> & { permission: string }) {
  const allowed = useCan(permission)
  return <input {...props} disabled={disabled || !allowed} />
}
