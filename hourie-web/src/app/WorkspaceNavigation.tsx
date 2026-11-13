import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import type { AuthenticatedUser } from "../features/auth/types";
import { fr, type Language } from "../i18n/fr";
import { LanguageSwitch } from "../shared/components/LanguageSwitch";
import { NavigationIcon } from "../shared/components/NavigationIcon";
import { ActionIcon } from "../shared/components/ActionIcon";
import { LoadingSpinner } from "../shared/components/LoadingSpinner";
import type { WorkspaceRoute } from "./routes";
import {
  assetCategories,
  assetCategoryLabel,
  type AssetView,
} from "../features/equipment/assetCategories";
import { AssetCategoryIcon } from "../features/equipment/components/AssetCategoryIcon";

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}

export const workspaceModules = () => [
  { section: "dashboard", label: fr.navigation.dashboard, path: "/dashboard", icon: "dashboard" },
  { section: "assets", label: fr.navigation.assets, path: "/assets/all", icon: "generators" },
  { section: "sites", label: fr.navigation.sites, path: "/sites", icon: "sites" },
  { section: "people", label: fr.navigation.people, path: "/people", icon: "people" },
  { section: "insurance", label: fr.navigation.insurance, path: "/insurance", icon: "insurance" },
  { section: "bonds", label: fr.navigation.bonds, path: "/bonds", icon: "bonds" },
  { section: "temporary-admissions", label: fr.navigation.temporaryAdmissions, path: "/temporary-admissions", icon: "insurance" },
] as const;

export function WorkspaceNavigationCards({
  language,
  activeSection,
  activeAssetCategory,
  onNavigate,
}: {
  language: Language;
  activeSection: WorkspaceRoute["section"];
  activeAssetCategory: AssetView;
  onNavigate: (path: string) => void;
}) {
  const assetModules = [
    { category: "all" as const, label: fr.assets.all, path: "/assets/all" },
    { category: "generator" as const, label: fr.navigation.generators, path: "/assets/generator" },
    ...assetCategories.map((category) => ({
      category: category.code,
      label: assetCategoryLabel(category.code, language),
      path: `/assets/${category.code}`,
    })),
  ];
  const managementModules = workspaceModules().filter((module) =>
    !["dashboard", "assets"].includes(module.section),
  );

  return (
    <section
      className="workspace-navigation-cards"
      aria-label={fr.navigation.quickAccess}
    >
      <header>
        <h2>{fr.navigation.applications}</h2>
      </header>
      <div className="workspace-navigation-scroll">
        <button
          type="button"
          className={activeSection === "dashboard" ? "active" : undefined}
          aria-current={activeSection === "dashboard" ? "page" : undefined}
          onClick={() => onNavigate("/dashboard")}
        >
          <span><NavigationIcon name="dashboard" /></span>
          <strong>{fr.navigation.dashboard}</strong>
        </button>
        {assetModules.map((module) => {
          const isActive = (activeSection === "assets" || activeSection === "generators") && activeAssetCategory === module.category;

          return (
            <button
              key={module.category}
              type="button"
              className={isActive ? "active" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(module.path)}
            >
              <span><AssetCategoryIcon category={module.category} /></span>
              <strong>{module.label}</strong>
            </button>
          );
        })}
        {managementModules.map((module) => {
          const isActive = module.section === activeSection;
          return <button
            key={module.path}
            type="button"
            className={isActive ? "active" : undefined}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(module.path)}
          >
            <span><NavigationIcon name={module.icon} /></span>
            <strong>{module.label}</strong>
          </button>;
        })}
      </div>
    </section>
  );
}

export function WorkspaceHeader({
  user,
  language,
  activeSection,
  onToggleLanguage,
  onSearch,
  onNavigateSettings,
  onLogout,
  isLoggingOut,
}: {
  user: AuthenticatedUser;
  language: Language;
  activeSection: WorkspaceRoute["section"];
  onToggleLanguage: () => void;
  onSearch: (query: string) => void;
  onNavigateSettings: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  const [query, setQuery] = useState("");

  return (
    <header className="workspace-header">
      <div className="workspace-brand">
        <span className="workspace-monogram" aria-hidden="true">A</span>
        <span className="workspace-brand-copy">
          <strong>A.B. HOURIE</strong>
          <small>ASSET OPERATIONS</small>
        </span>
      </div>
      <form className="workspace-global-search" role="search" onSubmit={(event) => { event.preventDefault(); if (query.trim()) onSearch(query.trim()); }}>
        <ActionIcon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === "ar" ? "البحث عن الأصول والمواقع والأشخاص..." : "Rechercher actifs, sites, personnes..."} aria-label={fr.equipment.search} />
      </form>
      <div className="user-menu">
        <LanguageSwitch language={language} onToggle={onToggleLanguage} />
        {user.permissions.manage_sites && (
          <button
            className={`workspace-settings-button${activeSection === "catalogs" ? " active" : ""}`}
            type="button"
            onClick={onNavigateSettings}
            aria-current={activeSection === "catalogs" ? "page" : undefined}
            title={fr.navigation.settings}
          >
            <NavigationIcon name="settings" />
            <span>{fr.navigation.settings}</span>
          </button>
        )}
        <Menu>
          <div className="account-menu">
            <MenuButton
              className="account-menu-button"
              aria-label={`${user.name} — ${fr.roles[user.role]}`}
              title={user.name}
            >
              <span className="user-avatar" aria-hidden="true">
                {userInitials(user.name)}
              </span>
              <span className="account-menu-identity">
                <strong>{user.name}</strong>
                <small>{fr.roles[user.role]}</small>
              </span>
              <ActionIcon name="expand" />
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

export function WorkspaceSidebar({
  language,
  activeSection,
  activeAssetCategory,
  isSidebarCollapsed,
  onToggleSidebar,
  onNavigate,
  onNavigateAsset,
}: {
  language: Language;
  activeSection: WorkspaceRoute["section"];
  activeAssetCategory: AssetView;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNavigate: (section: WorkspaceRoute["section"]) => void;
  onNavigateAsset: (category: AssetView) => void;
}) {
  const [isAssetsManuallyExpanded, setIsAssetsManuallyExpanded] =
    useState(false);
  const isAssetsExpanded =
    isAssetsManuallyExpanded ||
    activeSection === "assets" ||
    activeSection === "generators";

  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-heading">
        <p className="sidebar-label">{fr.navigation.title}</p>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={() => onToggleSidebar()}
          aria-label={
            isSidebarCollapsed ? fr.navigation.expand : fr.navigation.collapse
          }
          title={
            isSidebarCollapsed ? fr.navigation.expand : fr.navigation.collapse
          }
        >
          <ActionIcon name={isSidebarCollapsed ? "expand" : "collapse"} />
        </button>
      </div>
      <nav aria-label={fr.navigation.title}>
        <button
          title={fr.navigation.dashboard}
          className={`sidebar-dashboard-link${activeSection === "dashboard" ? " active" : ""}`}
          type="button"
          onClick={() => onNavigate("dashboard")}
        >
          <NavigationIcon name="dashboard" />
          <span className="nav-label">{fr.navigation.dashboard}</span>
        </button>
        <div className="sidebar-navigation-group">
          <p className="sidebar-group-label">{fr.navigation.inventory}</p>
          <div
            className={`sidebar-assets-heading${activeSection === "generators" || activeSection === "assets" ? " active-group" : ""}`}
          >
            <button
              title={fr.navigation.assets}
              className="sidebar-assets-toggle"
              type="button"
              onClick={() => {
                onNavigateAsset("all");
                setIsAssetsManuallyExpanded(true);
              }}
            >
              <AssetCategoryIcon category="all" />
              <span className="nav-label">{fr.navigation.assets}</span>
            </button>
            <button
              className="sidebar-assets-chevron"
              type="button"
              onClick={() => setIsAssetsManuallyExpanded((value) => !value)}
              aria-label={
                isAssetsExpanded ? fr.navigation.collapse : fr.navigation.expand
              }
              aria-expanded={isAssetsExpanded}
              aria-controls="sidebar-asset-categories"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m7.5 5 5 5-5 5" />
              </svg>
            </button>
          </div>
          <div
            id="sidebar-asset-categories"
            className={`sidebar-asset-disclosure${isAssetsExpanded ? " expanded" : ""}`}
            aria-hidden={!isAssetsExpanded}
            inert={!isAssetsExpanded}
          >
            <div className="sidebar-asset-children">
              <button
                title={fr.assets.all}
                className={`sidebar-child${activeSection === "assets" && activeAssetCategory === "all" ? " active" : ""}`}
                type="button"
                onClick={() => onNavigateAsset("all")}
              >
                <AssetCategoryIcon category="all" />
                <span className="nav-label">{fr.assets.all}</span>
              </button>
              <button
                title={fr.navigation.generators}
                className={`sidebar-child${activeAssetCategory === "generator" ? " active" : ""}`}
                type="button"
                onClick={() => onNavigateAsset("generator")}
              >
                <AssetCategoryIcon category="generator" />
                <span className="nav-label">{fr.navigation.generators}</span>
              </button>
              {assetCategories.map((category) => (
                <button
                  key={category.code}
                  title={assetCategoryLabel(category.code, language)}
                  className={`sidebar-child${activeSection === "assets" && activeAssetCategory === category.code ? " active" : ""}`}
                  type="button"
                  onClick={() => onNavigateAsset(category.code)}
                >
                  <AssetCategoryIcon category={category.code} />
                  <span className="nav-label">
                    {assetCategoryLabel(category.code, language)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          title={fr.navigation.insurance}
          className={`sidebar-section-link${activeSection === "insurance" ? " active" : ""}`}
          type="button"
          onClick={() => onNavigate("insurance")}
        >
          <NavigationIcon name="insurance" />
          <span className="nav-label">{fr.navigation.insurance}</span>
        </button>
        <button
          title={fr.navigation.bonds}
          className={`sidebar-section-link${activeSection === "bonds" ? " active" : ""}`}
          type="button"
          onClick={() => onNavigate("bonds")}
        >
          <NavigationIcon name="bonds" />
          <span className="nav-label">{fr.navigation.bonds}</span>
        </button>
        <button
          title={fr.navigation.temporaryAdmissions}
          className={`sidebar-section-link${activeSection === "temporary-admissions" ? " active" : ""}`}
          type="button"
          onClick={() => onNavigate("temporary-admissions")}
        >
          <NavigationIcon name="insurance" />
          <span className="nav-label">{fr.navigation.temporaryAdmissions}</span>
        </button>
        <button
          title={fr.navigation.sites}
          className={`sidebar-section-link${activeSection === "sites" ? " active" : ""}`}
          type="button"
          onClick={() => onNavigate("sites")}
        >
          <NavigationIcon name="sites" />
          <span className="nav-label">{fr.navigation.sites}</span>
        </button>
        <button
          title={fr.navigation.people}
          className={`sidebar-section-link${activeSection === "people" ? " active" : ""}`}
          type="button"
          onClick={() => onNavigate("people")}
        >
          <NavigationIcon name="people" />
          <span className="nav-label">{fr.navigation.people}</span>
        </button>
      </nav>
    </aside>
  );
}
