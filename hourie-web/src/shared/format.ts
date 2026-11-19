import { operationsLocale } from '../i18n/operations'

/*
 * Shared display formatting for dates, amounts and file sizes.
 *
 * Intl formatters are comparatively expensive to build and tables call these
 * helpers once per cell, so every formatter is created once and cached.
 */

const numberFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatters = new Map<string, Intl.DateTimeFormat>()

function numberFormatter(locale: string, options: Intl.NumberFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    numberFormatters.set(key, formatter)
  }
  return formatter
}

function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    dateFormatters.set(key, formatter)
  }
  return formatter
}

/* ----------------------------------------------------------------- amounts */

export function formatAmount(value: unknown): string {
  let normalized = typeof value === 'string' ? value.replace(/\s/g, '') : value
  if (typeof normalized === 'string' && normalized.includes(',')) {
    // Accept French decimal commas as well as legacy English grouped amounts.
    normalized = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)
      ? normalized.replace(/,/g, '')
      : normalized.replace(',', '.')
  }
  const amount = Number(normalized)
  return Number.isFinite(amount)
    ? numberFormatter('fr-FR', {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(amount)
    : String(value)
}

export function formatMoney(value: unknown, currency: string = 'FCFA'): string {
  return `${formatAmount(value)} ${currency === 'XOF' ? 'FCFA' : currency}`
}

/* ------------------------------------------------------------------- dates */

type DateStyle = 'short' | 'medium' | 'long'

type DateOptions = {
  /** short: 19/11/2026 · medium: 19 nov. 2026 · long: 19 novembre 2026 */
  style?: DateStyle
  /** Text returned when the value is empty. */
  fallback?: string
  /** Defaults to the active interface language. */
  locale?: string
}

const dateStyleOptions: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: {},
  medium: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
}

/**
 * Parses an API date. Date-only values ("2026-11-19") are read as local
 * midnight so they never shift to the previous day in negative time zones.
 */
export function parseApiDate(value: string): Date {
  return value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
}

export function formatDate(
  value: string | null | undefined,
  { style = 'short', fallback = '', locale = operationsLocale() }: DateOptions = {},
): string {
  if (!value) return fallback
  return dateFormatter(locale, dateStyleOptions[style]).format(parseApiDate(value))
}

export function formatDateTime(
  value: string | null | undefined,
  { fallback = '', locale = operationsLocale() }: Omit<DateOptions, 'style'> = {},
): string {
  if (!value) return fallback
  return dateFormatter(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

/* -------------------------------------------------------------- file sizes */

export function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}
