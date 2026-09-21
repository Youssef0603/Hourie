import type { CatalogOption } from './types'
import type { CSSProperties } from 'react'
import { activeLanguage } from '../../i18n/fr'

export function catalogOptions(options: CatalogOption[] | undefined, group: CatalogOption['group']) {
  return (options ?? []).filter((option) => option.group === group && option.is_active !== false)
}

export function catalogBadgeStyle(options: CatalogOption[] | undefined, group: CatalogOption['group'], code: string | null): CSSProperties | undefined {
  const color = options?.find((item) => item.group === group && item.code === code)?.color
  return color ? { color, backgroundColor: `${color}18`, borderColor: `${color}45` } : undefined
}

export function catalogLabel(options: CatalogOption[] | undefined, group: CatalogOption['group'], code: string | null) {
  if (!code) return ''
  const option = options?.find((item) => item.group === group && item.code === code)
  return (activeLanguage === 'ar' ? option?.label_ar : option?.label_fr) || option?.label_fr || code
}
