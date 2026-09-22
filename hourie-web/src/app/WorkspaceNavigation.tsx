import type { AuthenticatedUser } from '../features/auth/types'
import { fr, type Language } from '../i18n/fr'
import { LanguageSwitch } from '../shared/components/LanguageSwitch'
import { NavigationIcon } from '../shared/components/NavigationIcon'
import { ActionIcon } from '../shared/components/ActionIcon'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'
import hourieLogo from '../assets/hourie-logo.svg'
import type { WorkspaceRoute } from './routes'

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
          <div className="user-identity">
            <span className="user-avatar" aria-hidden="true">{userInitials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{fr.roles[user.role]}</span>
            </div>
          </div>
          <button className="logout-button" type="button" onClick={onLogout} disabled={isLoggingOut}>
            <ActionIcon name="logout" />
            {isLoggingOut ? <LoadingSpinner compact label={fr.auth.loggingOut} /> : <span>{fr.auth.logout}</span>}
          </button>
        </div>
      </header>
  )
}

export function WorkspaceSidebar({ user, activeSection, isSidebarCollapsed, onToggleSidebar, onNavigate }: {
  user: AuthenticatedUser
  activeSection: WorkspaceRoute['section']
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onNavigate: (section: WorkspaceRoute['section']) => void
}) {
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
              <button title={fr.navigation.generators} className={`sidebar-child ${activeSection === 'generators' ? 'active' : ''}`} type="button" onClick={() => onNavigate('generators')}><NavigationIcon name="generators" /><span className="nav-label">{fr.navigation.generators}</span></button>
            </div>
            <button title={fr.navigation.sites} className={activeSection === 'sites' ? 'active' : ''} type="button" onClick={() => onNavigate('sites')}><NavigationIcon name="sites" /><span className="nav-label">{fr.navigation.sites}</span></button>
            <button title={fr.navigation.people} className={activeSection === 'people' ? 'active' : ''} type="button" onClick={() => onNavigate('people')}><NavigationIcon name="people" /><span className="nav-label">{fr.navigation.people}</span></button>
            {user.permissions.manage_sites && <button title={fr.navigation.settings} className={activeSection === 'catalogs' ? 'active' : ''} type="button" onClick={() => onNavigate('catalogs')}><NavigationIcon name="settings" /><span className="nav-label">{fr.navigation.settings}</span></button>}
          </nav>
        </aside>
  )
}
