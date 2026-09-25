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
import { ForgotPasswordForm } from './components/forgot-password-form'

export function ForgotPassword() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Mot de passe oublié
          </CardTitle>
          <CardDescription>
            Entrez votre email pour recevoir un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
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
