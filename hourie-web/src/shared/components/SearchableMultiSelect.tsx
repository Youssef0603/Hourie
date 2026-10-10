import { useRef, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { fr } from "../../i18n/fr";
import type { SearchableOption } from "./SearchableSelect";

function searchableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

export function SearchableMultiSelect({
  values,
  options,
  onChange,
  placeholder,
  ariaLabel,
  selectedLabel,
  disabled = false,
}: {
  values: string[];
  options: SearchableOption[];
  onChange: (values: string[]) => void;
  placeholder: string;
  ariaLabel: string;
  selectedLabel: (count: number) => string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const normalizedQuery = searchableText(query);
  const filtered = normalizedQuery
    ? options.filter((option) => searchableText(option.label).includes(normalizedQuery))
    : options;

  return (
    <Combobox
      immediate
      multiple
      value={values}
      onChange={(selected: string[]) => onChange(selected)}
      onClose={() => setQuery("")}
      disabled={disabled}
    >
      {({ open }) => (
        <>
          <div className="searchable-select searchable-multi-select">
            <ComboboxInput
              className="searchable-select-input"
              aria-label={ariaLabel}
              displayValue={() => open ? query : (values.length ? selectedLabel(values.length) : "")}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              onClick={() => {
                if (!open) buttonRef.current?.click();
              }}
              placeholder={placeholder}
              autoComplete="off"
            />
            <ComboboxButton ref={buttonRef} className="searchable-select-button" aria-label={fr.common.showOptions}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
            </ComboboxButton>
          </div>
          <ComboboxOptions anchor="bottom start" className="searchable-select-options searchable-multi-options">
            {filtered.length === 0 && <div className="searchable-select-empty">{fr.common.noMatches}</div>}
            {filtered.map((option) => (
              <ComboboxOption className="searchable-select-option searchable-multi-option" key={option.value} value={option.value}>
                {({ selected }) => (
                  <>
                    <span className="searchable-multi-check" aria-hidden="true">{selected ? "✓" : ""}</span>
                    <span>{option.label}</span>
                  </>
                )}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </>
      )}
    </Combobox>
  );
}
