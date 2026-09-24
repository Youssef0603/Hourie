import type { CatalogOption } from './types'
import type { CSSProperties } from 'react'
import { activeLanguage } from '../../i18n/fr'

const fallbackConditions: Record<string, { fr: string; ar: string; color: string }> = {
  very_good: { fr: 'Très bon', ar: 'جيد جداً', color: '#237a4b' },
  good: { fr: 'Bon', ar: 'جيد', color: '#4b8f68' },
  to_monitor: { fr: 'À surveiller', ar: 'يحتاج إلى متابعة', color: '#a36213' },
  defective: { fr: 'Défectueux', ar: 'معطل', color: '#c27012' },
  out_of_service: { fr: 'Hors service', ar: 'خارج الخدمة', color: '#a12a36' },
}

export function catalogOptions(options: CatalogOption[] | undefined, group: CatalogOption['group']) {
  return (options ?? []).filter((option) => option.group === group && option.is_active !== false)
}

export function catalogBadgeStyle(options: CatalogOption[] | undefined, group: CatalogOption['group'], code: string | null): CSSProperties | undefined {
  const color = options?.find((item) => item.group === group && item.code === code)?.color
    ?? (group === 'equipment_condition' && code ? fallbackConditions[code]?.color : undefined)
  return color ? { color, backgroundColor: `${color}18`, borderColor: `${color}45` } : undefined
}

export function catalogLabel(options: CatalogOption[] | undefined, group: CatalogOption['group'], code: string | null) {
  if (!code) return ''
  const option = options?.find((item) => item.group === group && item.code === code)
  const fallback = group === 'equipment_condition' ? fallbackConditions[code] : undefined
  return (activeLanguage === 'ar' ? option?.label_ar ?? fallback?.ar : option?.label_fr ?? fallback?.fr) || option?.label_fr || fallback?.fr || code
}
