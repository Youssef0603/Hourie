export type ExpiryStatus = 'active' | 'soon' | 'expired'

/**
 * Classifies a document by its end date: expired once the end day is over,
 * "soon" within the warning window, otherwise active. No end date means the
 * document does not expire.
 */
export function expiryStatus(
  endsOn: string | null | undefined,
  warningDays = 30,
  now = new Date(),
): ExpiryStatus {
  if (!endsOn) return 'active'
  const end = new Date(`${endsOn}T23:59:59`)
  if (end < now) return 'expired'
  const limit = new Date(now)
  limit.setDate(limit.getDate() + warningDays)
  return end <= limit ? 'soon' : 'active'
}
