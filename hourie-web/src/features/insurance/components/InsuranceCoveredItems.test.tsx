import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InsuranceCoveredPeople } from "./InsuranceCoveredItems";

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
