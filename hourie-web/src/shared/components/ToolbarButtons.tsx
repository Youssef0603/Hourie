import type { ButtonHTMLAttributes } from "react";
import { ActionIcon } from "./ActionIcon";

type ActionIconName = Parameters<typeof ActionIcon>[0]["name"];

type ToolbarIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: ActionIconName;
  /** Accessible name, also shown as a tooltip. */
  label: string;
};

/** Square icon-only toolbar button (e.g. add, refresh). */
export function ToolbarIconButton({ icon, label, className = "", ...props }: ToolbarIconButtonProps) {
  const variant = icon === "add" ? "table-add-button" : "filter-refresh-button";
  return (
    <button
      type="button"
      className={`table-refresh-button ${variant} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <ActionIcon name={icon} />
    </button>
  );
}

type FilterToggleButtonProps = {
  label: string;
  active: boolean;
  /** Number of filters currently applied; hidden when zero. */
  count?: number;
  onClick: () => void;
};

export function FilterToggleButton({ label, active, count = 0, onClick }: FilterToggleButtonProps) {
  return (
    <button
      className={`advanced-filter-toggle${active ? " active" : ""}`}
      type="button"
      onClick={onClick}
      aria-expanded={active}
    >
      <ActionIcon name="filter" />
      <span>{label}</span>
      {count > 0 && <strong>{count}</strong>}
    </button>
  );
}
