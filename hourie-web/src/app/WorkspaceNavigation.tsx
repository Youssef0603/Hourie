import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import type { AuthenticatedUser } from "../features/auth/types";
import { fr, type Language } from "../i18n/fr";
import { LanguageSwitch } from "../shared/components/LanguageSwitch";
import { NavigationIcon } from "../shared/components/NavigationIcon";
import { ActionIcon } from "../shared/components/ActionIcon";
import { LoadingSpinner } from "../shared/components/LoadingSpinner";
import hourieLogo from "../assets/hourie-logo.svg";
import type { WorkspaceRoute } from "./routes";

type Section = WorkspaceRoute["section"];
type NavigationIconName = Parameters<typeof NavigationIcon>[0]["name"];

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}

const workspaceModules = () =>
  [
    { section: "dashboard", label: fr.navigation.dashboard, path: "/dashboard", icon: "dashboard", group: null },
    { section: "assets", label: fr.navigation.assets, path: "/assets/all", icon: "generators", group: "operations" },
    { section: "sites", label: fr.navigation.sites, path: "/sites", icon: "sites", group: "operations" },
    { section: "people", label: fr.navigation.people, path: "/people", icon: "people", group: "operations" },
    { section: "insurance", label: fr.navigation.insurance, path: "/insurance", icon: "insurance", group: "administration" },
    { section: "bonds", label: fr.navigation.bonds, path: "/bonds", icon: "bonds", group: "administration" },
    { section: "temporary-admissions", label: fr.navigation.temporaryAdmissions, path: "/temporary-admissions", icon: "insurance", group: "administration" },
    { section: "subcontracts", label: fr.navigation.subcontracts, path: "/subcontracts", icon: "subcontracts", group: "administration" },
    { section: "purchase-orders", label: fr.navigation.purchaseOrders, path: "/purchase-orders", icon: "documents", group: "administration" },
  ] as const satisfies readonly {
    section: Section;
    label: string;
    path: string;
    icon: NavigationIconName;
    group: "operations" | "administration" | null;
  }[];

function isModuleActive(moduleSection: Section, activeSection: Section) {
  return (
    moduleSection === activeSection ||
    (moduleSection === "assets" && activeSection === "generators")
  );
}

function activeModuleLabel(activeSection: Section) {
  if (activeSection === "catalogs") return fr.navigation.settings;
  return (
    workspaceModules().find((module) =>
      isModuleActive(module.section, activeSection),
    )?.label ?? fr.navigation.dashboard
  );
}

export function WorkspaceSidebar({
  activeSection,
  isOpen,
  onClose,
  onNavigate,
  showSubcontracts = true,
}: {
  activeSection: Section;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  /** False when the subcontracts module is switched off for this deployment. */
  showSubcontracts?: boolean;
}) {
  const modules = workspaceModules().filter((module) => showSubcontracts || module.section !== "subcontracts");
  const groups = [
    { key: null, label: null },
    { key: "operations", label: fr.navigation.operationsGroup },
    { key: "administration", label: fr.navigation.administrationGroup },
  ] as const;

  return (
    <>
      <aside
        id="workspace-sidebar"
        className={`app-sidebar${isOpen ? " open" : ""}`}
        aria-label={fr.navigation.quickAccess}
      >
        <div className="app-sidebar-brand">
          <img src={hourieLogo} alt={fr.app.companyName} />
          <button
            className="app-sidebar-close"
            type="button"
            onClick={onClose}
            aria-label={fr.common.close}
          >
            <ActionIcon name="close" />
          </button>
        </div>

        <nav aria-label={fr.navigation.title}>
          {groups.map((group) => (
            <div className="app-sidebar-group" key={group.key ?? "main"}>
              {group.label && <p className="app-sidebar-group-label">{group.label}</p>}
              {modules
                .filter((module) => module.group === group.key)
                .map((module) => {
                  const isActive = isModuleActive(module.section, activeSection);
                  return (
                    <button
                      key={module.path}
                      type="button"
                      className={`app-sidebar-link${isActive ? " active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => {
                        onNavigate(module.path);
                        onClose();
                      }}
                    >
                      <NavigationIcon name={module.icon} />
                      <span>{module.label}</span>
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <span className="app-sidebar-footer-dot" aria-hidden="true" />
          <span>{fr.app.companyName}</span>
        </div>
      </aside>
      {isOpen && (
        <div className="app-sidebar-backdrop" aria-hidden="true" onClick={onClose} />
      )}
    </>
  );
}

export function WorkspaceHeader({
  user,
  language,
  activeSection,
  onToggleLanguage,
  onNavigateSettings,
  onLogout,
  isLoggingOut,
  isSidebarOpen = false,
  onOpenSidebar,
}: {
  user: AuthenticatedUser;
  language: Language;
  activeSection: Section;
  onToggleLanguage: () => void;
  onNavigateSettings: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  isSidebarOpen?: boolean;
  onOpenSidebar?: () => void;
}) {
  return (
    <header className="app-topbar">
      <div className="app-topbar-context">
        {onOpenSidebar && (
          <button
            className="app-topbar-menu"
            type="button"
            onClick={onOpenSidebar}
            aria-label={fr.navigation.expand}
            aria-controls="workspace-sidebar"
            aria-expanded={isSidebarOpen}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        )}
        <img className="app-topbar-logo" src={hourieLogo} alt="" aria-hidden="true" />
        <p className="app-topbar-trail">
          <span>{fr.app.companyName}</span>
          <span aria-hidden="true">/</span>
          <strong>{activeModuleLabel(activeSection)}</strong>
        </p>
      </div>

      <div className="app-topbar-actions">
        <LanguageSwitch language={language} onToggle={onToggleLanguage} />
        {user.permissions.manage_sites && (
          <button
            className={`app-topbar-icon-button${activeSection === "catalogs" ? " active" : ""}`}
            type="button"
            onClick={onNavigateSettings}
            aria-current={activeSection === "catalogs" ? "page" : undefined}
            aria-label={fr.navigation.settings}
            title={fr.navigation.settings}
          >
            <NavigationIcon name="settings" />
          </button>
        )}
        <span className="app-topbar-divider" aria-hidden="true" />
        <Menu>
          <div className="account-menu">
            <MenuButton
              className="app-account-button"
              aria-label={`${user.name} — ${fr.roles[user.role]}`}
              title={user.name}
            >
              <span className="app-account-avatar" aria-hidden="true">
                {userInitials(user.name)}
              </span>
              <span className="app-account-identity" aria-hidden="true">
                <strong>{user.name}</strong>
                <span>{fr.roles[user.role]}</span>
              </span>
            </MenuButton>
            <MenuItems anchor="bottom end" className="account-dropdown">
              <div className="account-dropdown-identity">
                <strong>{user.name}</strong>
                <span>{fr.roles[user.role]}</span>
              </div>
              <MenuItem disabled={isLoggingOut}>
                <button
                  className="account-menu-action account-logout"
                  type="button"
                  onClick={onLogout}
                >
                  <ActionIcon name="logout" />
                  {isLoggingOut ? (
                    <LoadingSpinner compact label={fr.auth.loggingOut} />
                  ) : (
                    fr.auth.logout
                  )}
                </button>
              </MenuItem>
            </MenuItems>
          </div>
        </Menu>
      </div>
    </header>
  );
}
