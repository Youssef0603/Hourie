import { fr, type Language } from "../../../i18n/fr";
import { formatMoney } from "../../../shared/formatMoney";
import { assetCategory, assetFieldLabel } from "../assetCategories";
import { catalogBadgeStyle, catalogLabel } from "../catalogs";
import { displayedValue, locationName, measurement } from "../equipmentDisplay";
import type { Equipment, EquipmentFilterOptions } from "../types";

export function EquipmentAssignmentDetails({
  equipment,
  categoryCode,
}: {
  equipment: Equipment;
  categoryCode: string;
}) {
  return (
    <dl>
      <div><dt>{fr.equipment.project}</dt><dd>{equipment.current_project_assignment?.project.name ?? fr.common.notProvided}</dd></div>
      <div><dt>{fr.equipment.location}</dt><dd>{locationName(equipment)}</dd></div>
      <div>
        <dt>{categoryCode === "car" ? fr.equipment.assignedTo : fr.equipment.custodian}</dt>
        <dd>
          {equipment.responsible ? (
            <>
              {equipment.responsible.name}
              {equipment.responsible_source === "site" && <small className="responsibility-source">{fr.equipment.inheritedFromSite}</small>}
            </>
          ) : fr.common.notProvided}
        </dd>
      </div>
    </dl>
  );
}

export function EquipmentIdentificationDetails({
  equipment,
  categoryCode,
  catalogs,
  isSold,
}: {
  equipment: Equipment;
  categoryCode: string;
  catalogs: EquipmentFilterOptions["catalogs"] | undefined;
  isSold: boolean;
}) {
  return (
    <dl>
      <div>
        <dt>{categoryCode === "car" ? fr.equipment.registrationNumber : fr.equipment.serialNumber}</dt>
        <dd>{displayedValue(equipment.serial_number)}</dd>
      </div>
      <div><dt>{fr.equipment.model}</dt><dd>{displayedValue(equipment.model)}</dd></div>
      <div><dt>{fr.equipment.manufactureYear}</dt><dd>{displayedValue(equipment.manufacture_year)}</dd></div>
      <div><dt>{fr.equipment.purchaseDate}</dt><dd>{displayedValue(equipment.purchase_date)}</dd></div>
      <div>
        <dt>{fr.equipment.condition}</dt>
        <dd>
          {equipment.condition ? (
            <span className={`status-badge status-${equipment.condition}`} style={catalogBadgeStyle(catalogs, "equipment_condition", equipment.condition)}>
              {catalogLabel(catalogs, "equipment_condition", equipment.condition)}
            </span>
          ) : fr.common.notProvided}
        </dd>
      </div>
      {categoryCode === "generator" && isSold && (
        <div><dt>Acheteur</dt><dd>{equipment.generator_details?.sold_to ?? fr.common.notProvided}</dd></div>
      )}
      <div>
        <dt>{fr.equipment.situation}</dt>
        <dd>
          {equipment.operational_situation ? (
            <span className="status-badge" style={catalogBadgeStyle(catalogs, "operational_situation", equipment.operational_situation)}>
              {catalogLabel(catalogs, "operational_situation", equipment.operational_situation)}
            </span>
          ) : fr.common.notProvided}
        </dd>
      </div>
    </dl>
  );
}

export function AssetSpecificationDetails({
  equipment,
  definition,
  language,
}: {
  equipment: Equipment;
  definition: NonNullable<ReturnType<typeof assetCategory>>;
  language: Language;
}) {
  return (
    <dl>
      {definition.fields.map((field) => {
        const value = equipment.asset_details?.[field.key];
        const isCost = field.key === "purchase_price" || field.key === "shipping_cost";
        const display = value === null || value === undefined || value === ""
          ? fr.common.notProvided
          : isCost
            ? formatMoney(value, priceCurrencyLabel(equipment.asset_details?.[`${field.key}_currency`]))
            : `${value}${field.unit ? ` ${field.unit}` : ""}`;

        return <div key={field.key}><dt>{assetFieldLabel(field, language)}</dt><dd>{display}</dd></div>;
      })}
    </dl>
  );
}

export function GeneratorTechnicalDetails({
  equipment,
  catalogs,
}: {
  equipment: Equipment;
  catalogs: EquipmentFilterOptions["catalogs"] | undefined;
}) {
  const details = equipment.generator_details;
  if (!details) return null;

  return (
    <dl>
      <div><dt>{fr.equipment.apparentPower}</dt><dd>{measurement(details.apparent_power_kva, "kVA")}</dd></div>
      <div><dt>{fr.equipment.activePower}</dt><dd>{measurement(details.active_power_kw, "kW")}</dd></div>
      <div><dt>{fr.equipment.voltage}</dt><dd>{displayedValue(details.voltage_rating)}</dd></div>
      <div><dt>{fr.equipment.frequency}</dt><dd>{displayedValue(details.frequency_hz)}</dd></div>
      <div><dt>{fr.equipment.current}</dt><dd>{displayedValue(details.current_rating)}</dd></div>
      <div><dt>{fr.equipment.phases}</dt><dd>{displayedValue(details.phases)}</dd></div>
      <div>
        <dt>{fr.equipment.fuel}</dt>
        <dd>
          {details.fuel_type ? (
            <span className="status-badge" style={catalogBadgeStyle(catalogs, "fuel_type", details.fuel_type)}>
              {catalogLabel(catalogs, "fuel_type", details.fuel_type)}
            </span>
          ) : fr.common.notProvided}
        </dd>
      </div>
      <div><dt>{fr.equipment.tank}</dt><dd>{displayedValue(details.tank_capacity_litres)}</dd></div>
      <div><dt>{fr.equipment.engineHours}</dt><dd>{displayedValue(details.current_engine_hours)}</dd></div>
      <div><dt>{fr.equipment.purchasePrice}</dt><dd>{details.purchase_price_fcfa === null ? fr.common.notProvided : formatMoney(details.purchase_price_fcfa)}</dd></div>
    </dl>
  );
}

function priceCurrencyLabel(currency: unknown): string {
  return currency === "EUR" || currency === "USD" ? currency : "FCFA";
}
