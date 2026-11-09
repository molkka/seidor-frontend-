import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { authApi } from '@/services/authApi'
import { AnimatePresence } from 'framer-motion'
import {
  CircleCheck,
  CloudOff,
  KeyRound,
  Link2Off,
  LoaderCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  AuthBackToSignIn,
  AuthCardHeader,
} from '@/components/auth/auth-card-layout'
import {
  AuthMessage,
  AuthPasswordInput,
  Reveal,
} from '@/components/auth/auth-controls'
import { authRequestErrorMessage, httpStatus } from '../../request-error'

// Mirrors the API rules: at least 8 characters, at most 72 bytes (bcrypt)
const PASSWORD_RULE = 'Use between 8 and 72 characters.'

const formSchema = z
  .object({
    new_password: z
      .string()
      .min(8, { message: PASSWORD_RULE })
      .max(72, { message: PASSWORD_RULE }),
    confirm_password: z
      .string()
      .min(1, { message: 'Confirm your new password.' }),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof formSchema>

type Phase = 'checking' | 'unreachable' | 'invalid' | 'form' | 'done'

interface ResetPasswordFormProps {
  token?: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [phase, setPhase] = useState<Phase>(token ? 'checking' : 'invalid')
  const [accountEmail, setAccountEmail] = useState<string>()
  const [checkAttempt, setCheckAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => () => inFlight.current?.abort(), [])

  // Validate the link before showing the form, so an expired or used link
  // is reported up front instead of after the user has typed a password.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    authApi
      .verifyResetToken(token, controller.signal)
      .then((res) => {
        setAccountEmail(res.data.email)
        setPhase(res.data.valid ? 'form' : 'invalid')
      })
      .catch(() => {
        // A network failure is not an invalid link: offer a retry instead
        if (!controller.signal.aborted) setPhase('unreachable')
      })
    return () => controller.abort()
  }, [token, checkAttempt])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  async function onSubmit({ new_password }: FormValues) {
    if (!token || inFlight.current) return
    const controller = new AbortController()
    inFlight.current = controller
    setSubmitting(true)
    setError(null)
    try {
      await authApi.resetPassword(token, new_password, controller.signal)
      setPhase('done')
    } catch (err) {
      if (controller.signal.aborted) return
      const status = httpStatus(err)
      if (status === 400) setPhase('invalid')
      else if (status === 422)
        form.setError('new_password', { message: PASSWORD_RULE })
      else setError(authRequestErrorMessage(err))
    } finally {
      inFlight.current = null
      setSubmitting(false)
    }
  }

  if (phase === 'checking') {
    return (
      <AuthCardHeader
        icon={LoaderCircle}
        spin
        title='Checking your link'
        autoFocus
      >
        This only takes a moment.
      </AuthCardHeader>
    )
  }

  if (phase === 'unreachable') {
    return (
      <>
        <AuthCardHeader
          icon={CloudOff}
          tone='error'
          title="We couldn't verify your link"
          autoFocus
        >
          We couldn't reach the server. Check your connection and try again.
        </AuthCardHeader>
        <Button
          type='button'
          className='mt-8 h-10 w-full font-semibold'
          onClick={() => {
            setPhase('checking')
            setCheckAttempt((n) => n + 1)
          }}
        >
          Try again
        </Button>
        <AuthBackToSignIn />
      </>
    )
  }

  if (phase === 'invalid') {
    return (
      <>
        <AuthCardHeader
          icon={Link2Off}
          tone='error'
          title='This link is invalid or has expired'
          autoFocus
        >
          Reset links expire after 1 hour and can only be used once. Request a
          new link to continue.
        </AuthCardHeader>
        <Button asChild className='mt-8 h-10 w-full font-semibold'>
          <Link to='/forgot-password'>Request a new link</Link>
        </Button>
        <AuthBackToSignIn />
      </>
    )
  }

  if (phase === 'done') {
    return (
      <>
        <AuthCardHeader
          icon={CircleCheck}
          tone='success'
          title='Password updated'
          autoFocus
        >
          Your password has been changed. You can now sign in with your new
          password.
        </AuthCardHeader>
        <Button asChild className='mt-8 h-10 w-full font-semibold'>
          <Link to='/'>Continue to sign in</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <AuthCardHeader icon={KeyRound} title='Set a new password'>
        {accountEmail ? (
          <>
            Choose a new password for{' '}
            <span className='font-medium break-all text-foreground'>
              {accountEmail}
            </span>
            .
          </>
        ) : (
          'Choose a new password for your account.'
        )}
      </AuthCardHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className='mt-8 flex flex-col'
        >
          <FormField
            control={form.control}
            name='new_password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <AuthPasswordInput
                    placeholder='At least 8 characters'
                    autoComplete='new-password'
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='confirm_password'
            render={({ field }) => (
              <FormItem className='mt-5'>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <AuthPasswordInput
                    placeholder='Repeat your new password'
                    autoComplete='new-password'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <AnimatePresence initial={false}>
            {error && (
              <Reveal key='error'>
                <div className='pt-5'>
                  <AuthMessage tone='error'>{error}</AuthMessage>
                </div>
              </Reveal>
            )}
          </AnimatePresence>

          <Button
            type='submit'
            disabled={submitting}
            className='mt-6 h-10 w-full font-semibold'
          >
            {submitting && <LoaderCircle className='animate-spin' />}
            {submitting ? 'Updating password…' : 'Reset password'}
          </Button>
        </form>
      </Form>

      <AuthBackToSignIn />
    </>
  )
}
