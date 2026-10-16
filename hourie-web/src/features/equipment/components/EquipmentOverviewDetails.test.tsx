import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Equipment } from "../types";
import { EquipmentIdentificationDetails } from "./EquipmentOverviewDetails";

describe("EquipmentIdentificationDetails", () => {
  it("shows a car serial number and registration separately", () => {
    render(
      <EquipmentIdentificationDetails
        equipment={
          {
            serial_number: "VF1HJD202PA301098",
            registration_number: "AA-406-CG",
            model: "Duster",
            manufacture_year: 2023,
            purchase_date: null,
            condition: null,
            generator_details: null,
          } as Equipment
        }
        categoryCode="car"
        catalogs={undefined}
        isSold={false}
      />,
    );

    expect(screen.getByText("Numéro de série")).toBeVisible();
    expect(screen.getByText("VF1HJD202PA301098")).toBeVisible();
    expect(screen.getByText("Immatriculation")).toBeVisible();
    expect(screen.getByText("AA-406-CG")).toBeVisible();
  });
});
