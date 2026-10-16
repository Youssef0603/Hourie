import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Equipment } from "../types";
import { GeneratorTransferHistory } from "./EquipmentHistoryDetails";

const changes = [
  {
    id: 12,
    type: "project_assignment_changed",
    source: "transfer",
    actor: { id: 1, name: "Manager" },
    occurred_at: "2026-10-16T10:00:00.000Z",
    can_remove: true,
    transfer: {
      from: { project: "Bassam", location: "Lot 1" },
      to: { project: "Abidjan", location: "Base" },
    },
  },
  {
    id: 11,
    type: "project_assignment_changed",
    source: "transfer",
    actor: { id: 1, name: "Manager" },
    occurred_at: "2026-10-15T10:00:00.000Z",
    can_remove: false,
    transfer: {
      from: { project: "Virdi", location: "Dépôt" },
      to: { project: "Bassam", location: "Lot 1" },
    },
  },
] satisfies Equipment["changes"];

describe("GeneratorTransferHistory", () => {
  it("offers removal only for the latest removable transfer", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <GeneratorTransferHistory
        changes={changes}
        canManage
        onRemove={onRemove}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Supprimer ce transfert" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Supprimer ce transfert" }));
    expect(onRemove).toHaveBeenCalledWith(12);
  });
});
