import { describe, expect, it } from "vitest";
import { formatAmountInput, parseAmountInput } from "./amountInput";

describe("amount input", () => {
  it("separates thousands so large amounts are easy to read", () => {
    expect(formatAmountInput("104522040")).toBe("104 522 040");
    expect(formatAmountInput("1500.5")).toBe("1 500,5");
    expect(formatAmountInput("")).toBe("");
  });

  it("reads typed amounts back as plain numbers", () => {
    expect(parseAmountInput("104 522 040")).toBe("104522040");
    expect(parseAmountInput("1 500,25")).toBe("1500.25");
    expect(parseAmountInput("1 500,256")).toBe("1500.25");
    expect(parseAmountInput("12a3")).toBe("12");
    expect(parseAmountInput("")).toBe("");
  });
});
