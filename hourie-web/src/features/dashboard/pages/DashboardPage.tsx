import { useEffect, useState } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { getDashboard } from "../api";
import type {
  DashboardAssetItem,
  DashboardData,
  DashboardMaintenanceItem,
  DashboardSection,
  DashboardTransferItem,
} from "../types";
import "./dashboard-page.css";

type SectionKey = keyof DashboardData["sections"];

const sectionMeta: Record<SectionKey, {
  title: string;
  subtitle: string;
  icon: Parameters<typeof ActionIcon>[0]["name"];
  tone: string;
}> = {
  repair_required: {
    title: "Équipements à réparer",
    subtitle: "Équipements défectueux ou hors service",
    icon: "maintenance",
    tone: "critical",
  },
  unknown_location: {
    title: "Localisation inconnue",
    subtitle: "Actifs sans localisation physique enregistrée",
    icon: "location",
    tone: "warning",
  },
  missing_identity_or_documents: {
    title: "Identification et documents",
    subtitle: "Numéros de série ou documents manquants",
    icon: "identification",
    tone: "warning",
  },
  maintenance_by_hours: {
    title: "Entretien par heures moteur",
    subtitle: "Échéance dépassée ou à moins de 50 heures",
    icon: "history",
    tone: "maintenance",
  },
  recent_transfers: {
    title: "Transferts récents",
    subtitle: "Affectations modifiées durant les 30 derniers jours",
    icon: "transfer",
    tone: "transfer",
  },
  incomplete_records: {
    title: "Fiches à compléter",
    subtitle: "Informations essentielles encore manquantes",
    icon: "note",
    tone: "info",
  },
};

const sectionOrder = Object.keys(sectionMeta) as SectionKey[];

export function DashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    getDashboard()
      .then(setData)
      .catch(() => setError("Impossible de charger le tableau de bord."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError("Impossible de charger le tableau de bord."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <main className="dashboard-page"><LoadingSpinner label="Chargement du tableau de bord…" /></main>;
  if (error || !data) return <main className="dashboard-page"><div className="form-alert" role="alert">{error}</div><button className="secondary-button" type="button" onClick={load}>Réessayer</button></main>;

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="section-label">SUIVI OPÉRATIONNEL</p>
          <h1>Tableau de bord</h1>
          <p>Les éléments qui demandent une vérification ou une action.</p>
        </div>
        <div className="dashboard-heading-actions">
          <span>Actualisé {formatRelative(data.generated_at)}</span>
          <button className="dashboard-refresh-button" type="button" onClick={load}><ActionIcon name="refresh" />Actualiser</button>
        </div>
      </header>

      <nav className="dashboard-summary" aria-label="Résumé des points à traiter">
        {sectionOrder.map((key) => {
          const meta = sectionMeta[key];
          return <button key={key} type="button" onClick={() => document.querySelector(`#dashboard-${key}`)?.scrollIntoView({ behavior: "smooth" })}>
            <span className={`dashboard-summary-icon ${meta.tone}`}><ActionIcon name={meta.icon} /></span>
            <span><strong>{data.sections[key].total.toLocaleString("fr-FR")}</strong><small>{meta.title}</small></span>
            <ActionIcon name="expand" />
          </button>;
        })}
      </nav>

      <div className="dashboard-operational-grid">
        {sectionOrder.map((key) => (
          <OperationalSection
            key={key}
            sectionKey={key}
            section={data.sections[key]}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </main>
  );
}

function OperationalSection({
  sectionKey,
  section,
  onNavigate,
}: {
  sectionKey: SectionKey;
  section: DashboardSection<DashboardAssetItem | DashboardMaintenanceItem | DashboardTransferItem>;
  onNavigate: (path: string) => void;
}) {
  const meta = sectionMeta[sectionKey];

  return (
    <section className="dashboard-operational-card" id={`dashboard-${sectionKey}`}>
      <header>
        <span className={`dashboard-card-icon ${meta.tone}`}><ActionIcon name={meta.icon} /></span>
        <div><h2>{meta.title}</h2><p>{meta.subtitle}</p></div>
        <strong>{section.total.toLocaleString("fr-FR")}</strong>
      </header>
      {section.items.length === 0
        ? <EmptyState compact icon="inbox" title="Aucun élément" description="Rien à traiter dans cette section." />
        : <div className="dashboard-asset-list">{section.items.map((item) => (
          <button key={item.id} type="button" onClick={() => onNavigate(item.path)}>
            <span className="dashboard-asset-main">
              <span><b>{item.asset_code}</b><em>{item.category_name ?? "Équipement"}</em></span>
              <strong>{item.label}</strong>
              <small>{item.project_name ?? item.location_name ?? "Aucune affectation"}</small>
            </span>
            <span className="dashboard-asset-context">
              {sectionKey === "maintenance_by_hours"
                ? <MaintenanceContext item={item as DashboardMaintenanceItem} />
                : sectionKey === "recent_transfers"
                  ? <TransferContext item={item as DashboardTransferItem} />
                  : <IssueContext item={item} />}
            </span>
            <ActionIcon name="expand" />
          </button>
        ))}</div>}
      {section.total > section.items.length && <button className="dashboard-view-all" type="button" onClick={() => onNavigate("/assets/all")}>Voir tous les actifs concernés<ActionIcon name="expand" /></button>}
    </section>
  );
}

function IssueContext({ item }: { item: DashboardAssetItem }) {
  return <>{item.issues.slice(0, 2).map((issue) => <em className={item.severity} key={issue}>{issue}</em>)}{item.issues.length > 2 && <small>+{item.issues.length - 2}</small>}</>;
}

function MaintenanceContext({ item }: { item: DashboardMaintenanceItem }) {
  return <><strong className={item.hours_remaining <= 0 ? "critical" : "warning"}>{item.hours_remaining <= 0 ? `${Math.abs(item.hours_remaining)} h dépassées` : `${item.hours_remaining} h restantes`}</strong><small>{item.current_engine_hours} h / {item.next_maintenance_engine_hours} h</small></>;
}

function TransferContext({ item }: { item: DashboardTransferItem }) {
  return <><strong>{item.from && item.to ? `${item.from} → ${item.to}` : item.to ?? "Affectation modifiée"}</strong><small>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.occurred_at))}</small></>;
}

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `il y a ${hours} h` : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}
