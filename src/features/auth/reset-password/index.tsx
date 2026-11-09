import { AuthCardLayout } from '@/components/auth/auth-card-layout'
import { ResetPasswordForm } from './components/reset-password-form'

interface ResetPasswordProps {
  token?: string
}

export function ResetPassword({ token }: ResetPasswordProps) {
  return (
    <AuthCardLayout>
      <ResetPasswordForm token={token} />
    </AuthCardLayout>
  )
}
