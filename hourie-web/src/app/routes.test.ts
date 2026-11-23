import { describe, expect, it } from "vitest";
import { parseWorkspaceRoute, workspacePath } from "./routes";

describe("purchase order routes", () => {
  it("opens purchase orders from the sidebar route", () => {
    const route = parseWorkspaceRoute("/purchase-orders");

    expect(route).toEqual({ section: "purchase-orders", siteId: null, equipmentId: null });
    expect(workspacePath(route)).toBe("/purchase-orders");
  });

  it.each(["/documents", "/documents/purchase-orders"])("redirects the old %s link to purchase orders", (path) => {
    const route = parseWorkspaceRoute(path);

    expect(route.section).toBe("purchase-orders");
    expect(workspacePath(route)).toBe("/purchase-orders");
  });
});
