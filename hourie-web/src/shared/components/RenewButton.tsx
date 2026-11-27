import { operationPhrase } from "../../i18n/operations";
import { DetailIconButton } from "./DetailIconButton";
import "./renewal.css";

/** "Renouveler" in a detail toolbar; solid red when the record is expired or expires soon. */
export function RenewButton({ due, onClick }: { due: boolean; onClick: () => void }) {
  return (
    <DetailIconButton
      icon="refresh"
      label={operationPhrase("Renouveler")}
      className={`renew-button${due ? " is-due" : ""}`}
      onClick={onClick}
    />
  );
}
