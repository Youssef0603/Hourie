import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceNavigationCards } from "./WorkspaceNavigation";

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
