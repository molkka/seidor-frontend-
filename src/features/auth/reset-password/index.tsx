import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { ResetPasswordForm } from './components/reset-password-form'

interface ResetPasswordProps {
  token?: string
}

export function ResetPassword({ token }: ResetPasswordProps) {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Nouveau mot de passe
          </CardTitle>
          <CardDescription>
            Choisissez un mot de passe sécurisé d'au moins 8 caractères.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} />
        </CardContent>
        <CardFooter>
          <p className='mx-auto text-sm text-muted-foreground'>
            <Link
              to='/login'
              className='underline underline-offset-4 hover:text-primary'
            >
              ← Retour à la connexion
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
