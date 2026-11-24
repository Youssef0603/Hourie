import type { InputHTMLAttributes, Ref } from "react";
import { formatAmountInput, parseAmountInput } from "../amountInput";

type AmountInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "inputMode"> & {
  /** Plain number as the API expects it: "104522040" or "1500.5". */
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<HTMLInputElement>;
};

/**
 * Money field that shows the amount with its thousands separated while the
 * user types (104 522 040 instead of 104522040), and hands back a plain number.
 */
export function AmountInput({ value, onChange, ref, ...props }: AmountInputProps) {
  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={formatAmountInput(value)}
      onChange={(event) => onChange(parseAmountInput(event.target.value))}
    />
  );
}
