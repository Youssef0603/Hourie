/** Lower-cases and strips accents so "Électrogène" matches "electrogene". */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('fr-FR')
    .trim()
}
