import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Equipment } from "../types";
import {
  EquipmentIdentificationDetails,
  GeneratorTechnicalDetails,
} from "./EquipmentOverviewDetails";

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
            supplier: "SOCIDA",
            origin: "Roumanie",
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
    expect(screen.getByText("Fournisseur")).toBeVisible();
    expect(screen.getByText("SOCIDA")).toBeVisible();
    expect(screen.getByText("Origine")).toBeVisible();
    expect(screen.getByText("Roumanie")).toBeVisible();
  });
});

describe("GeneratorTechnicalDetails", () => {
  it("displays the purchase price in its recorded currency", () => {
    render(
      <GeneratorTechnicalDetails
        equipment={
          {
            generator_details: {
              apparent_power_kva: "365.00",
              active_power_kw: null,
              phases: null,
              voltage_rating: null,
              frequency_hz: null,
              current_rating: null,
              fuel_type: null,
              tank_capacity_litres: null,
              current_engine_hours: null,
              purchase_price_fcfa: "11000.00",
              purchase_price_currency: "EUR",
              sold_to: null,
            },
          } as Equipment
        }
        catalogs={undefined}
      />,
    );

    expect(screen.getByText(/11.*000 EUR/)).toBeVisible();
  });
});
