import { useEffect, useState } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import type { AuthenticatedUser } from '../features/auth/types'
import { fr, type Language } from '../i18n/fr'
import { LanguageSwitch } from '../shared/components/LanguageSwitch'
import { NavigationIcon } from '../shared/components/NavigationIcon'
import { ActionIcon } from '../shared/components/ActionIcon'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import hourieLogo from '../assets/hourie-logo.svg'
import type { WorkspaceRoute } from './routes'
import { assetCategories, assetCategoryLabel, type AssetView } from '../features/equipment/assetCategories'
import { AssetCategoryIcon } from '../features/equipment/components/AssetCategoryIcon'

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toUpperCase()
}

export function WorkspaceHeader({ user, language, onToggleLanguage, onLogout, isLoggingOut }: {
  user: AuthenticatedUser
  language: Language
  onToggleLanguage: () => void
  onLogout: () => void
  isLoggingOut: boolean
}) {
  return (
      <header className="workspace-header">
        <div className="workspace-brand">
          <span className="workspace-logo-frame">
            <img className="workspace-logo" src={hourieLogo} alt={fr.app.companyName} />
          </span>
        </div>
        <div className="user-menu">
          <LanguageSwitch language={language} onToggle={onToggleLanguage} />
          <Menu>
            <div className="account-menu">
              <MenuButton className="account-menu-button" aria-label={`${user.name} — ${fr.roles[user.role]}`} title={user.name}>
                <span className="user-avatar" aria-hidden="true">{userInitials(user.name)}</span>
              </MenuButton>
              <MenuItems anchor="bottom end" className="account-dropdown">
                <div className="account-dropdown-identity">
                  <strong>{user.name}</strong>
                  <span>{fr.roles[user.role]}</span>
                </div>
                <MenuItem disabled={isLoggingOut}>
                  <button className="account-logout" type="button" onClick={onLogout}>
                    <ActionIcon name="logout" />
                    {isLoggingOut ? <LoadingSpinner compact label={fr.auth.loggingOut} /> : fr.auth.logout}
                  </button>
                </MenuItem>
              </MenuItems>
            </div>
          </Menu>
        </div>
      </header>
  )
}

export function WorkspaceSidebar({ user, language, activeSection, activeAssetCategory, isSidebarCollapsed, onToggleSidebar, onNavigate, onNavigateAsset }: {
  user: AuthenticatedUser
  language: Language
  activeSection: WorkspaceRoute['section']
  activeAssetCategory: AssetView
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onNavigate: (section: WorkspaceRoute['section']) => void
  onNavigateAsset: (category: AssetView) => void
}) {
  const [isAssetsExpanded, setIsAssetsExpanded] = useState(false)

  useEffect(() => {
    if (activeSection === 'assets' || activeSection === 'generators') {
      setIsAssetsExpanded(true)
    }
  }, [activeSection, activeAssetCategory])

  return (
        <aside className="workspace-sidebar">
          <div className="sidebar-heading">
            <p className="sidebar-label">{fr.navigation.title}</p>
            <button className="sidebar-toggle" type="button" onClick={() => onToggleSidebar()} aria-label={isSidebarCollapsed ? fr.navigation.expand : fr.navigation.collapse} title={isSidebarCollapsed ? fr.navigation.expand : fr.navigation.collapse}>
              <ActionIcon name={isSidebarCollapsed ? 'expand' : 'collapse'} />
            </button>
          </div>
          <nav aria-label={fr.navigation.title}>
            <div className="sidebar-navigation-group">
              <p className="sidebar-group-label">{fr.navigation.inventory}</p>
              <div className={`sidebar-assets-heading${activeSection === 'generators' || activeSection === 'assets' ? ' active-group' : ''}`}>
                <button title={fr.navigation.assets} className="sidebar-assets-toggle" type="button" onClick={() => { onNavigateAsset('all'); setIsAssetsExpanded(true) }}>
                  <AssetCategoryIcon category="all" /><span className="nav-label">{fr.navigation.assets}</span>
                </button>
                <button className="sidebar-assets-chevron" type="button" onClick={() => setIsAssetsExpanded((value) => !value)} aria-label={isAssetsExpanded ? fr.navigation.collapse : fr.navigation.expand} aria-expanded={isAssetsExpanded} aria-controls="sidebar-asset-categories">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 5 5 5-5 5" /></svg>
                </button>
              </div>
              <div id="sidebar-asset-categories" className={`sidebar-asset-disclosure${isAssetsExpanded ? ' expanded' : ''}`} aria-hidden={!isAssetsExpanded} inert={!isAssetsExpanded}>
                <div className="sidebar-asset-children">
                  <button title={fr.assets.all} className={`sidebar-child${activeSection === 'assets' && activeAssetCategory === 'all' ? ' active' : ''}`} type="button" onClick={() => onNavigateAsset('all')}><AssetCategoryIcon category="all" /><span className="nav-label">{fr.assets.all}</span></button>
                  <button title={fr.navigation.generators} className={`sidebar-child${activeAssetCategory === 'generator' ? ' active' : ''}`} type="button" onClick={() => onNavigateAsset('generator')}><AssetCategoryIcon category="generator" /><span className="nav-label">{fr.navigation.generators}</span></button>
                  {assetCategories.map((category) => <button key={category.code} title={assetCategoryLabel(category.code, language)} className={`sidebar-child${activeSection === 'assets' && activeAssetCategory === category.code ? ' active' : ''}`} type="button" onClick={() => onNavigateAsset(category.code)}><AssetCategoryIcon category={category.code} /><span className="nav-label">{assetCategoryLabel(category.code, language)}</span></button>)}
                </div>
              </div>
            </div>
            <button title={fr.navigation.sites} className={activeSection === 'sites' ? 'active' : ''} type="button" onClick={() => onNavigate('sites')}><NavigationIcon name="sites" /><span className="nav-label">{fr.navigation.sites}</span></button>
            <button title={fr.navigation.people} className={activeSection === 'people' ? 'active' : ''} type="button" onClick={() => onNavigate('people')}><NavigationIcon name="people" /><span className="nav-label">{fr.navigation.people}</span></button>
            {user.permissions.manage_sites && <button title={fr.navigation.settings} className={`sidebar-settings-link${activeSection === 'catalogs' ? ' active' : ''}`} type="button" onClick={() => onNavigate('catalogs')}><NavigationIcon name="settings" /><span className="nav-label">{fr.navigation.settings}</span></button>}
          </nav>
        </aside>
  )
}
