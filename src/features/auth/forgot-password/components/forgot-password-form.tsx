import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '@/services/authApi'
import { AnimatePresence } from 'framer-motion'
import { KeyRound, LoaderCircle, Mail, MailCheck } from 'lucide-react'
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
import { AuthInput, AuthMessage, Reveal } from '@/components/auth/auth-controls'
import { authRequestErrorMessage, httpStatus } from '../../request-error'

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Enter your email address.' })
    .email({ message: 'Enter a valid email address.' }),
})

type FormValues = z.infer<typeof formSchema>

export function ForgotPasswordForm() {
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Also the duplicate-submission guard: set while a request is in flight
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => () => inFlight.current?.abort(), [])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit({ email }: FormValues) {
    if (inFlight.current) return
    const controller = new AbortController()
    inFlight.current = controller
    setSending(true)
    setError(null)
    try {
      await authApi.forgotPassword(email, controller.signal)
      setSentTo(email)
    } catch (err) {
      if (controller.signal.aborted) return
      if (httpStatus(err) === 422) {
        form.setError('email', { message: 'Enter a valid email address.' })
      } else {
        setError(authRequestErrorMessage(err))
      }
    } finally {
      inFlight.current = null
      setSending(false)
    }
  }

  if (sentTo) {
    return (
      <>
        <AuthCardHeader
          icon={MailCheck}
          tone='success'
          title='Check your email'
          autoFocus
        >
          If an account exists for{' '}
          <span className='font-medium break-all text-foreground'>
            {sentTo}
          </span>
          , you will receive instructions to reset your password.
        </AuthCardHeader>
        <p className='mt-4 text-sm leading-relaxed text-muted-foreground'>
          The link expires in 1 hour. Didn't receive anything? Check your spam
          folder, then try again.
        </p>
        <Button
          type='button'
          variant='outline'
          className='mt-6 h-10 w-full bg-white font-semibold hover:bg-muted hover:text-foreground'
          onClick={() => {
            form.reset({ email: sentTo })
            setSentTo(null)
          }}
        >
          Try again
        </Button>
        <AuthBackToSignIn />
      </>
    )
  }

  return (
    <>
      <AuthCardHeader icon={KeyRound} title='Forgot your password?'>
        Enter your email address and we'll send you a link to reset your
        password.
      </AuthCardHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className='mt-8 flex flex-col'
        >
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <AuthInput
                    type='email'
                    icon={Mail}
                    placeholder='you@seidor.com'
                    autoComplete='email'
                    autoFocus
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
            disabled={sending}
            className='mt-6 h-10 w-full font-semibold'
          >
            {sending && <LoaderCircle className='animate-spin' />}
            {sending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </Form>

      <AuthBackToSignIn />
    </>
  )
}
