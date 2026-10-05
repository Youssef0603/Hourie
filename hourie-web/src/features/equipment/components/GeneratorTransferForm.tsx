import { useMemo, useState, type FormEvent } from "react";
import { fr } from "../../../i18n/fr";
import { ApiError } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { transferEquipment } from "../api";
import type { Equipment, EquipmentFilterOptions } from "../types";

export function GeneratorTransferForm({
  equipment,
  options,
  onTransferred,
  onCancel,
}: {
  equipment: Equipment;
  options: EquipmentFilterOptions;
  onTransferred: (equipment: Equipment) => void;
  onCancel: () => void;
}) {
  const currentProjectId =
    equipment.current_project_assignment?.project.id ?? null;
  const currentProjectName =
    equipment.current_project_assignment?.project.name ?? fr.common.notAssigned;
  const [destinationProjectId, setDestinationProjectId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destinationProjects = options.projects.filter(
    (project) => project.id !== currentProjectId,
  );
  const destinationLocations = useMemo(
    () =>
      options.locations.filter(
        (location) =>
          location.parent_id !== null &&
          String(location.project_id) === destinationProjectId,
      ),
    [destinationProjectId, options.locations],
  );

  const selectedDestinationLocationId = destinationLocations.some(
    (location) => String(location.id) === destinationLocationId,
  )
    ? destinationLocationId
    : destinationLocations.length === 1
      ? String(destinationLocations[0].id)
      : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (destinationProjectId === "" || selectedDestinationLocationId === "")
      return;
    setIsSaving(true);
    setError(null);

    try {
      onTransferred(
        await transferEquipment(equipment.id, {
          from_project_id: currentProjectId,
          to_project_id: Number(destinationProjectId),
          to_location_id: Number(selectedDestinationLocationId),
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.errors)[0]?.[0] ?? fr.equipment.transferError)
          : fr.equipment.transferError,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="maintenance-form generator-transfer-form"
      onSubmit={submit}
    >
      <div className="transfer-equipment-summary">
        <span>
          <ActionIcon name="specifications" />
        </span>
        <div>
          <strong>
            {[equipment.brand, equipment.model].filter(Boolean).join(" ") ||
              equipment.asset_code}
          </strong>
          <small>{equipment.asset_code}</small>
          <p>
            {fr.equipment.transferFrom}: <b>{currentProjectName}</b>
          </p>
        </div>
      </div>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <div className="maintenance-form-grid">
        <label className="field-wide">
          <span>
            {fr.equipment.transferTo} <em>*</em>
          </span>
          <SearchableSelect
            ariaLabel={fr.equipment.transferTo}
            value={destinationProjectId}
            onChange={(value) => {
              setDestinationProjectId(value);
              setDestinationLocationId("");
            }}
            placeholder={fr.equipment.selectDestination}
            includeEmpty={false}
            options={destinationProjects.map((project) => ({
              value: String(project.id),
              label: project.name,
            }))}
          />
        </label>
        {destinationProjectId !== "" && (
          <label className="field-wide">
            <span>
              {fr.equipment.destinationLocation} <em>*</em>
            </span>
            <SearchableSelect
              ariaLabel={fr.equipment.destinationLocation}
              value={selectedDestinationLocationId}
              onChange={setDestinationLocationId}
              placeholder={fr.common.notProvided}
              required
              options={destinationLocations.map((location) => ({
                value: String(location.id),
                label: location.name,
              }))}
            />
          </label>
        )}
      </div>
      <div className="transfer-form-actions">
        <button
          className="transfer-cancel-button"
          type="button"
          onClick={onCancel}
        >
          {fr.common.cancel}
        </button>
        <button
          className="primary-button save-button transfer-submit-button"
          type="submit"
          disabled={
            isSaving ||
            destinationProjectId === "" ||
            selectedDestinationLocationId === ""
          }
        >
          <ActionIcon name="transfer" />
          {isSaving ? (
            <LoadingSpinner compact label={fr.common.saving} />
          ) : (
            fr.equipment.confirmTransfer
          )}
        </button>
      </div>
    </form>
  );
}
