import { ActionIcon, type ActionIconName } from "./ActionIcon";

/**
 * Icon-only action in a detail panel toolbar (edit, renew…), for actions
 * whose icon says it all. The label shows on hover and is read by screen
 * readers.
 */
export function DetailIconButton({
  icon,
  label,
  onClick,
  disabled,
  className = "",
}: {
  icon: ActionIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`detail-toolbar-button detail-icon-button ${className}`.trim()}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <ActionIcon name={icon} />
    </button>
  );
}
