import { isAssetCategoryCode, type AssetCategoryCode } from '../features/equipment/assetCategories'

export type WorkspaceRoute =
  | { section: 'generators'; equipmentId: number | null; siteId: null }
  | { section: 'assets'; assetCategory: AssetCategoryCode | 'all'; equipmentId: number | null; siteId: null }
  | { section: 'sites'; siteView: 'assets' | 'insurance'; equipmentId: number | null; siteId: number | null }
  | { section: 'insurance'; insuranceProjectId: number | null; equipmentId: null; siteId: null }
  | { section: 'people' | 'catalogs' | 'bonds'; equipmentId: null; siteId: null }

export function parseWorkspaceRoute(pathname: string): WorkspaceRoute {
  const parts = pathname.split('/').filter(Boolean)
  const id = (value: string | undefined) => value && /^[1-9]\d*$/.test(value) ? Number(value) : null

  if (parts[0] === 'sites' && id(parts[1]) && parts[2] === 'insurance' && parts.length === 3) {
    return { section: 'sites', siteView: 'insurance', siteId: id(parts[1]), equipmentId: null }
  }
  if (parts[0] === 'sites' && id(parts[1]) && (parts.length === 2 || (parts[2] === 'generators' && id(parts[3]) && parts.length === 4))) {
    return { section: 'sites', siteView: 'assets', siteId: id(parts[1]), equipmentId: id(parts[3]) }
  }
  if (parts[0] === 'sites' && parts.length === 1) return { section: 'sites', siteView: 'assets', siteId: null, equipmentId: null }
  if (parts[0] === 'generators' && (parts.length === 1 || (id(parts[1]) && parts.length === 2))) {
    return { section: 'generators', siteId: null, equipmentId: id(parts[1]) }
  }
  if (parts[0] === 'assets' && parts.length === 1) return { section: 'assets', assetCategory: 'all', siteId: null, equipmentId: null }
  if (parts[0] === 'assets' && parts[1] === 'generator' && (parts.length === 2 || (id(parts[2]) && parts.length === 3))) {
    return { section: 'generators', siteId: null, equipmentId: id(parts[2]) }
  }
  if (parts[0] === 'assets' && (parts[1] === 'all' || isAssetCategoryCode(parts[1] ?? '')) && (parts.length === 2 || (id(parts[2]) && parts.length === 3))) {
    return { section: 'assets', assetCategory: parts[1] as AssetCategoryCode | 'all', siteId: null, equipmentId: id(parts[2]) }
  }
  if (parts[0] === 'people' && parts.length === 1) return { section: 'people', siteId: null, equipmentId: null }
  if (parts[0] === 'insurance' && parts[1] === 'sites' && id(parts[2]) && parts.length === 3) return { section: 'sites', siteView: 'insurance', siteId: id(parts[2]), equipmentId: null }
  if (parts[0] === 'insurance' && parts.length === 1) return { section: 'insurance', insuranceProjectId: null, siteId: null, equipmentId: null }
  if (parts[0] === 'bonds' && parts.length === 1) return { section: 'bonds', siteId: null, equipmentId: null }
  if (parts[0] === 'settings' && parts.length === 1) return { section: 'catalogs', siteId: null, equipmentId: null }

  return { section: 'generators', siteId: null, equipmentId: null }
}

export function workspacePath(route: WorkspaceRoute): string {
  if (route.section === 'sites' && route.siteId) return `/sites/${route.siteId}${route.siteView === 'insurance' ? '/insurance' : route.equipmentId ? `/generators/${route.equipmentId}` : ''}`
  if (route.section === 'generators') return `/assets/generator${route.equipmentId ? `/${route.equipmentId}` : ''}`
  if (route.section === 'assets') return `/assets/${route.assetCategory}${route.equipmentId ? `/${route.equipmentId}` : ''}`
  if (route.section === 'catalogs') return '/settings'
  if (route.section === 'insurance') return route.insuranceProjectId ? `/insurance/sites/${route.insuranceProjectId}` : '/insurance'
  if (route.section === 'bonds') return '/bonds'
  return `/${route.section}`
}
