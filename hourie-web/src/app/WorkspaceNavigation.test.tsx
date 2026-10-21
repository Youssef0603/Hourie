import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../features/auth/types";
import { WorkspaceHeader, WorkspaceNavigationCards } from "./WorkspaceNavigation";

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
    manage_maintenance: true,
    delete_maintenance: true,
    delete_equipment: true,
    manage_sites: true,
    manage_users: true,
    manage_manager_accounts: true,
  },
};

describe("WorkspaceNavigationCards", () => {
  it("keeps the workspace destinations visible and marks the current section", async () => {
    const onNavigate = vi.fn();
    render(
      <WorkspaceNavigationCards
        activeSection="people"
        onNavigate={onNavigate}
      />,
    );

    const navigation = screen.getByRole("region", { name: "Accès aux espaces" });
    expect(within(navigation).getByRole("button", { name: "Personnel" })).toHaveAttribute("aria-current", "page");

    await userEvent.click(within(navigation).getByRole("button", { name: "Actifs" }));
    expect(onNavigate).toHaveBeenCalledWith("/assets/all");
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
});
