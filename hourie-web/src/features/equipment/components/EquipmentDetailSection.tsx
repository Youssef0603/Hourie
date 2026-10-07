import type { ReactNode } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";

export type EquipmentDetailSectionIcon =
  | "location"
  | "identification"
  | "specifications"
  | "note"
  | "photo"
  | "invoice"
  | "maintenance"
  | "history"
  | "transfer";

export function EquipmentDetailSection({
  id,
  className,
  title,
  children,
  defaultOpen = false,
  icon,
}: {
  id?: string;
  className?: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: EquipmentDetailSectionIcon;
}) {
  return (
    <details
      id={id}
      className={`detail-section${className ? ` ${className}` : ""}`}
      open={defaultOpen}
    >
      <summary>
        <h3>
          {icon && <ActionIcon name={icon} />}
          {title}
        </h3>
        <ActionIcon name="expand" />
      </summary>
      <div className="detail-section-body">{children}</div>
    </details>
  );
}
