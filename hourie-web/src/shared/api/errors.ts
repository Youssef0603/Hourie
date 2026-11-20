import { ApiError } from './http'

/** First validation message of an API error, or the fallback text. */
export function apiErrorMessage(exception: unknown, fallback: string): string {
  if (exception instanceof ApiError) {
    return Object.values(exception.errors ?? {}).flat()[0] ?? exception.message
  }
  return fallback
}
