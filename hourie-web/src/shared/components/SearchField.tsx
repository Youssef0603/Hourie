import { useId } from "react";
import { fr } from "../../i18n/fr";
import { ActionIcon } from "./ActionIcon";

type SearchFieldProps = {
  /** Accessible label; visually hidden. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
};

/** Toolbar search input with a clear button. */
export function SearchField({ label, value, onChange, placeholder, id }: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="search-field has-custom-clear">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== "" && (
        <button
          className="search-clear-button"
          type="button"
          onClick={() => onChange("")}
          aria-label={fr.common.clearSearch}
        >
          <ActionIcon name="close" />
        </button>
      )}
    </div>
  );
}
