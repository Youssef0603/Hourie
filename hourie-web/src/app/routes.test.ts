import { describe, expect, it } from "vitest";
import { parseWorkspaceRoute, workspacePath } from "./routes";

describe("document workspace routes", () => {
  it("keeps the purchase-order list route across refreshes", () => {
    const route = parseWorkspaceRoute("/documents/purchase-orders");

    expect(route).toEqual({
      section: "documents",
      documentView: "purchase-orders",
      siteId: null,
      equipmentId: null,
    });
    expect(workspacePath(route)).toBe("/documents/purchase-orders");
  });

  it("keeps the document template gallery at the base route", () => {
    const route = parseWorkspaceRoute("/documents");

    expect(route.section).toBe("documents");
    expect(workspacePath(route)).toBe("/documents");
  });
});
