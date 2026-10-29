import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { assetCategory, generalEquipmentCategoryCodes } from "../assetCategories";
import type { Equipment } from "../types";
import {
  AssetSpecificationDetails,
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

describe("AssetSpecificationDetails", () => {
  it.each(generalEquipmentCategoryCodes)("shows recorded technical data for %s", (categoryCode) => {
    render(
      <AssetSpecificationDetails
        equipment={
          {
            asset_details: {
              equipment_type: "Excavator",
              sub_category: "Earth Moving",
            },
          } as unknown as Equipment
        }
        definition={assetCategory(categoryCode)!}
        language="fr"
      />,
    );

    expect(screen.getByText("Type de matériel")).toBeVisible();
    expect(screen.getByText("Excavator")).toBeVisible();
    expect(screen.getByText("Sous-catégorie")).toBeVisible();
    expect(screen.getByText("Earth Moving")).toBeVisible();
  });

  it("shows recorded truck plate data and hides empty characteristics", () => {
    render(
      <AssetSpecificationDetails
        equipment={
          {
            asset_details: {
              vehicle_type: "ROAD TRACTOR",
              manufacturer: "China National Heavy Duty Truck Group Co., Ltd",
              engine_output_hp: 371,
              permissible_combination_weight_kg: 55000,
              payload_tonnes: null,
            },
          } as unknown as Equipment
        }
        definition={assetCategory("truck_dumper")!}
        language="fr"
      />,
    );

    expect(screen.getByText("Constructeur")).toBeVisible();
    expect(screen.getByText("China National Heavy Duty Truck Group Co., Ltd")).toBeVisible();
    expect(screen.getByText("371 ch")).toBeVisible();
    expect(screen.getByText("55000 kg")).toBeVisible();
    expect(screen.queryByText("Charge utile (t)")).not.toBeInTheDocument();
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
