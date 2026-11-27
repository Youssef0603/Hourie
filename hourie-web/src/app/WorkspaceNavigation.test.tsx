import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../features/auth/types";
import { WorkspaceHeader, WorkspaceSidebar } from "./WorkspaceNavigation";

const user: AuthenticatedUser = {
  id: 1,
  name: "Youssef Yassine",
  username: "youssef",
  email: "youssef@example.com",
  role: "cms_manager",
  must_change_password: false,
  employee: null,
  permissions: {
    manage_equipment: true,
    create_equipment: true,
    transfer_equipment: true,
    manage_temporary_admissions: true,
    manage_maintenance: true,
    delete_maintenance: true,
    delete_equipment: true,
    manage_sites: true,
    manage_purchase_orders: true,
    manage_subcontracts: true,
    manage_users: true,
    manage_manager_accounts: true,
  },
  site_scope: null,
  features: { subcontracts: true },
};

describe("WorkspaceSidebar", () => {
  it("lists the workspace destinations, marks the current section and closes after navigating", async () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    render(
      <WorkspaceSidebar
        activeSection="people"
        isOpen
        onClose={onClose}
        onNavigate={onNavigate}
      />,
    );

    const navigation = screen.getByRole("complementary", { name: "Accès aux espaces" });
    expect(within(navigation).getByRole("button", { name: "Personnel" })).toHaveAttribute("aria-current", "page");
    expect(within(navigation).getByText("Exploitation")).toBeVisible();
    expect(within(navigation).getByText("Administration")).toBeVisible();

    await userEvent.click(within(navigation).getByRole("button", { name: "Actifs" }));
    expect(onNavigate).toHaveBeenCalledWith("/assets/all");
    expect(onClose).toHaveBeenCalled();
  });

  it("treats the generator view as part of the assets section", () => {
    render(
      <WorkspaceSidebar
        activeSection="generators"
        isOpen={false}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Actifs" })).toHaveAttribute("aria-current", "page");
  });

  it("shows a Chef de chantier only the assets of his site", () => {
    render(
      <WorkspaceSidebar activeSection="assets" isOpen onClose={vi.fn()} onNavigate={vi.fn()} onlyAssets />,
    );
    const navigation = screen.getByRole("complementary", { name: "Accès aux espaces" });
    expect(within(navigation).getByRole("button", { name: "Actifs" })).toBeInTheDocument();
    for (const hidden of ["Tableau de bord", "Personnel", "Assurances", "Bons de commande"]) {
      expect(within(navigation).queryByRole("button", { name: hidden })).not.toBeInTheDocument();
    }
  });

  it("hides the subcontracts module when it is switched off", () => {
    const { rerender } = render(
      <WorkspaceSidebar activeSection="dashboard" isOpen onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Sous-traitance" })).toBeInTheDocument();

    rerender(
      <WorkspaceSidebar activeSection="dashboard" isOpen onClose={vi.fn()} onNavigate={vi.fn()} showSubcontracts={false} />,
    );
    expect(screen.queryByRole("button", { name: "Sous-traitance" })).not.toBeInTheDocument();
  });
});

describe("WorkspaceHeader", () => {
  it("keeps settings in the header and out of the profile menu", async () => {
    const onNavigateSettings = vi.fn();
    const interaction = userEvent.setup();

    render(
      <WorkspaceHeader
        user={user}
        language="fr"
        activeSection="dashboard"
        onToggleLanguage={vi.fn()}
        onNavigateSettings={onNavigateSettings}
        onLogout={vi.fn()}
        isLoggingOut={false}
      />,
    );

    await interaction.click(screen.getByRole("button", { name: "Paramètres" }));
    expect(onNavigateSettings).toHaveBeenCalledOnce();

    await interaction.click(screen.getByRole("button", { name: /Youssef Yassine/ }));
    const profileMenu = await screen.findByRole("menu");
    expect(within(profileMenu).queryByText("Paramètres")).not.toBeInTheDocument();
    expect(within(profileMenu).getByText("Se déconnecter")).toBeVisible();
  });

  it("keeps the settings control available on the settings page", async () => {
    const onNavigateSettings = vi.fn();
    const interaction = userEvent.setup();

    render(
      <WorkspaceHeader
        user={user}
        language="fr"
        activeSection="catalogs"
        onToggleLanguage={vi.fn()}
        onNavigateSettings={onNavigateSettings}
        onLogout={vi.fn()}
        isLoggingOut={false}
      />,
    );

    const settingsButton = screen.getByRole("button", { name: "Paramètres" });
    expect(settingsButton).toHaveAttribute("aria-current", "page");
    expect(settingsButton).toHaveClass("active");

    await interaction.click(settingsButton);
    expect(onNavigateSettings).toHaveBeenCalledOnce();
  });
});
