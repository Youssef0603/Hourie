import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  InsuranceCoveredEquipment,
  InsuranceCoveredPeople,
} from "./InsuranceCoveredItems";

describe("InsuranceCoveredEquipment", () => {
  it("searches covered equipment across its identification fields", async () => {
    const user = userEvent.setup();
    render(
      <InsuranceCoveredEquipment
        equipment={[
          {
            id: 1,
            asset_code: "A.H-CAM-024",
            brand: "SinoTruck",
            model: "Howo 17m3 HOWO 336",
          },
          {
            id: 2,
            asset_code: "A.H-MAT-031",
            brand: "Mercedes",
            model: "Actros",
          },
        ]}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Rechercher un équipement" }),
      "Mercedes 031",
    );

    expect(screen.getByText("Mercedes Actros")).toBeVisible();
    expect(screen.queryByText("SinoTruck Howo 17m3 HOWO 336")).not.toBeInTheDocument();
    expect(screen.getByText("1 actif couvert")).toBeVisible();
  });
});

describe("InsuranceCoveredPeople", () => {
  it("searches covered people by name without requiring exact accents or case", async () => {
    const user = userEvent.setup();
    render(
      <InsuranceCoveredPeople
        employees={[
          { id: 1, name: "Élodie Kouassi", birth_date: null },
          { id: 2, name: "Youssef Yassine", birth_date: null },
        ]}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Rechercher une personne" }),
      "ELODIE",
    );

    expect(screen.getByText("Élodie Kouassi")).toBeVisible();
    expect(screen.queryByText("Youssef Yassine")).not.toBeInTheDocument();
    expect(screen.getByText("1 personne couverte")).toBeVisible();
  });
});
