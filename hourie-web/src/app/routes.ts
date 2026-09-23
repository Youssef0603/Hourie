import { isAssetCategoryCode, type AssetCategoryCode } from '../features/equipment/assetCategories'

export type WorkspaceRoute =
  | { section: 'generators'; equipmentId: number | null; siteId: null }
  | { section: 'assets'; assetCategory: AssetCategoryCode | 'all'; equipmentId: number | null; siteId: null }
  | { section: 'sites'; equipmentId: number | null; siteId: number | null }
  | { section: 'people' | 'catalogs'; equipmentId: null; siteId: null }

export function parseWorkspaceRoute(pathname: string): WorkspaceRoute {
  const parts = pathname.split('/').filter(Boolean)
  const id = (value: string | undefined) => value && /^[1-9]\d*$/.test(value) ? Number(value) : null

  if (parts[0] === 'sites' && id(parts[1]) && (parts.length === 2 || (parts[2] === 'generators' && id(parts[3]) && parts.length === 4))) {
    return { section: 'sites', siteId: id(parts[1]), equipmentId: id(parts[3]) }
  }
  if (parts[0] === 'sites' && parts.length === 1) return { section: 'sites', siteId: null, equipmentId: null }
  if (parts[0] === 'generators' && (parts.length === 1 || (id(parts[1]) && parts.length === 2))) {
    return { section: 'generators', siteId: null, equipmentId: id(parts[1]) }
  }
  if (parts[0] === 'assets' && parts.length === 1) return { section: 'generators', siteId: null, equipmentId: null }
  if (parts[0] === 'assets' && parts[1] === 'generator' && (parts.length === 2 || (id(parts[2]) && parts.length === 3))) {
    return { section: 'generators', siteId: null, equipmentId: id(parts[2]) }
  }
  if (parts[0] === 'assets' && (parts[1] === 'all' || isAssetCategoryCode(parts[1] ?? '')) && (parts.length === 2 || (id(parts[2]) && parts.length === 3))) {
    return { section: 'assets', assetCategory: parts[1] as AssetCategoryCode | 'all', siteId: null, equipmentId: id(parts[2]) }
  }
  if (parts[0] === 'people' && parts.length === 1) return { section: 'people', siteId: null, equipmentId: null }
  if (parts[0] === 'settings' && parts.length === 1) return { section: 'catalogs', siteId: null, equipmentId: null }

  return { section: 'generators', siteId: null, equipmentId: null }
}

export function workspacePath(route: WorkspaceRoute): string {
  if (route.siteId) return `/sites/${route.siteId}${route.equipmentId ? `/generators/${route.equipmentId}` : ''}`
  if (route.section === 'generators') return `/assets/generator${route.equipmentId ? `/${route.equipmentId}` : ''}`
  if (route.section === 'assets') return `/assets/${route.assetCategory}${route.equipmentId ? `/${route.equipmentId}` : ''}`
  if (route.section === 'catalogs') return '/settings'
  return `/${route.section}`
}
