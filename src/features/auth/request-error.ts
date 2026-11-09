import { isAxiosError } from 'axios'

/**
 * User-facing message for a failed auth request. Deliberately generic: it
 * never echoes server details, which could reveal internals or whether an
 * account exists.
 */
export function authRequestErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response || err.code === 'ECONNABORTED') {
      return "We couldn't reach the server. Check your connection and try again."
    }
    if (err.response.status === 429) {
      return 'Too many requests. Please wait a few minutes before trying again.'
    }
  }
  return "We couldn't process your request right now. Please try again later."
}

export function httpStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined
}
