import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EquipmentInsuranceCoverage } from "./EquipmentCoverageDetails";

describe("EquipmentInsuranceCoverage", () => {
  it("does not render fields whose values are missing", () => {
    render(
      <EquipmentInsuranceCoverage
        policies={[
          {
            id: 42,
            policy_number: "3189-10100001",
            source: "GNA-CI",
            ends_on: "2027-10-31",
          },
        ]}
      />,
    );

    expect(screen.getByText("N° de police")).toBeVisible();
    expect(screen.getByText("Assureur")).toBeVisible();
    expect(screen.getByText("Expiration")).toBeVisible();
    expect(screen.queryByText("Prime TTC")).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
