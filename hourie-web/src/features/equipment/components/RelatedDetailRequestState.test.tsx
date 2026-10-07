import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { RelatedDetailRequestState } from "./RelatedDetailRequestState";

it("shows a retryable error instead of a permanent loading state", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onRetry = vi.fn();

  render(
    <RelatedDetailRequestState
      status="error"
      onClose={onClose}
      onRetry={onRetry}
    />,
  );

  expect(screen.getByText("Impossible de charger ce détail.")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Réessayer" }));
  await user.click(screen.getByRole("button", { name: "Fermer" }));

  expect(onRetry).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
});
