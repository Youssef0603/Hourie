/**
 * On/off switch with its label, for a setting that shows or hides a group
 * of fields (e.g. a person's access to the system).
 */
export function ToggleSwitch({ checked, onChange, label, description, disabled = false }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle-switch${checked ? " on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-switch-track" aria-hidden="true"><span className="toggle-switch-thumb" /></span>
      <span className="toggle-switch-text">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </button>
  );
}
