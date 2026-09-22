import { useRef, useState } from 'react'
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { fr } from '../../i18n/fr'

export type SearchableOption = { value: string; label: string }

type SearchableSelectProps = {
  value: string
  options: SearchableOption[]
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  disabled?: boolean
  required?: boolean
  searchable?: boolean
  includeEmpty?: boolean
}

function searchableText(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim()
}

export function SearchableSelect({ value, options, onChange, placeholder, ariaLabel, disabled = false, required = false, searchable = true, includeEmpty = true }: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const normalizedQuery = searchableText(query)
  const choices = includeEmpty ? [{ value: '', label: placeholder }, ...options] : options
  const filtered = normalizedQuery
    ? choices.filter((option) => searchableText(option.label).includes(normalizedQuery))
    : choices

  return <Combobox immediate value={value} onChange={(selected: string | null) => onChange(selected ?? '')} onClose={() => setQuery('')} disabled={disabled}>
    {({ open }) => <>
    <div className="searchable-select">
      <ComboboxInput
        className="searchable-select-input"
        aria-label={ariaLabel}
        displayValue={(selected: string) => selected === '' ? '' : options.find((option) => option.value === selected)?.label ?? ''}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onClick={() => { if (!open) buttonRef.current?.click() }}
        placeholder={placeholder}
        required={required && searchable}
        readOnly={!searchable}
        autoComplete="off"
      />
      <ComboboxButton ref={buttonRef} className="searchable-select-button" aria-label={fr.common.showOptions}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
      </ComboboxButton>
    </div>
    <ComboboxOptions anchor="bottom start" className="searchable-select-options">
      {filtered.length === 0 && <div className="searchable-select-empty">{fr.common.noMatches}</div>}
      {filtered.map((option) => <ComboboxOption className="searchable-select-option" key={option.value} value={option.value}>{option.label}</ComboboxOption>)}
    </ComboboxOptions>
    </>}
  </Combobox>
}
