import { useEffect, useState } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal } from "../../../shared/components/Modal";
import { getDashboard } from "../api";
import type { DashboardData } from "../types";
import "./dashboard-page.css";

const statusLabels = {
  assigned: "Affectés",
  available: "Disponibles",
  under_maintenance: "En maintenance",
  to_monitor: "À surveiller",
  out_of_service: "Hors service",
};

const healthLabels = {
  healthy: "Stable",
  attention: "À surveiller",
  critical: "Critique",
};

const statusColors = {
  assigned: "#d31245",
  available: "#e989a1",
  under_maintenance: "#d88916",
  to_monitor: "#5268d8",
  out_of_service: "#a33eb8",
};

const categoryColors = ["#d31245", "#3a7ee8", "#16a085", "#d88916", "#7b61d1", "#e36b45", "#4195a3", "#a33eb8"];

export function DashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [highlightUrgentActions, setHighlightUrgentActions] = useState(false);

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
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("Impossible de charger le tableau de bord.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!highlightUrgentActions) return;
    const timeout = window.setTimeout(() => setHighlightUrgentActions(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [highlightUrgentActions]);

  if (loading) return <main className="dashboard-page"><LoadingSpinner label="Chargement du tableau de bord…" /></main>;
  if (error || !data) return <main className="dashboard-page"><div className="form-alert" role="alert">{error}</div><button className="secondary-button" type="button" onClick={load}>Réessayer</button></main>;

  const assignmentRate = data.summary.active_equipment
    ? Math.round(data.summary.assigned_equipment / data.summary.active_equipment * 100)
    : 0;
  const attentionCount = data.urgent_actions.length;
  const summaryCards = [
    { label: "Équipements actifs", value: data.summary.active_equipment, meta: `${data.summary.assigned_equipment} équipements affectés`, path: "/assets/all", icon: "specifications", tone: "blue" },
    { label: "Sites actifs", value: data.summary.active_sites, meta: "Chantiers actuellement suivis", path: "/sites", icon: "location", tone: "indigo" },
    { label: "Taux d’affectation", value: `${assignmentRate}%`, meta: `${data.summary.assigned_equipment} équipements affectés`, path: "/assets/all", icon: "transfer", tone: "green" },
    { label: "Points d’attention", value: attentionCount, meta: "Voir les actions prioritaires ci-dessous", path: "#urgent-actions", icon: "note", tone: "amber" },
    { label: "Personnel actif", value: data.summary.active_people, meta: "Voir l’annuaire du personnel", path: "/people", icon: "people", tone: "rose" },
  ] as const;
  const maxCategory = Math.max(1, ...data.equipment_categories.map((item) => item.total));
  const selectedProject = data.project_health.find((project) => project.id === selectedProjectId) ?? null;

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="section-label">Vue d’ensemble</p>
          <h1>Tableau de bord</h1>
          <p>Pilotez vos chantiers et votre parc d’équipements en un coup d’œil.</p>
        </div>
        <div className="dashboard-heading-actions">
          <span><i aria-hidden="true">✓</i>Données actualisées {formatRelative(data.generated_at)}</span>
          <button className="dashboard-refresh-button" type="button" onClick={load}><ActionIcon name="refresh" />Actualiser</button>
        </div>
      </header>

      <section className="dashboard-kpis" aria-label="Indicateurs principaux">
        {summaryCards.map((card) => (
          <button className={card.path.startsWith("#") ? "dashboard-kpi-scroll" : undefined} key={card.label} type="button" onClick={() => {
            navigate(card.path, onNavigate);
            if (card.path === "#urgent-actions") setHighlightUrgentActions(true);
          }}>
            <span className={`dashboard-kpi-icon ${card.tone}`}><ActionIcon name={card.icon} /></span>
            <ActionIcon name="expand" />
            <span className="dashboard-kpi-content">
              <strong>{typeof card.value === "number" ? card.value.toLocaleString("fr-FR") : card.value}</strong>
              <b>{card.label}</b>
              <small>{card.meta}</small>
            </span>
          </button>
        ))}
      </section>

      <div className="dashboard-grid dashboard-grid-primary">
        <section id="urgent-actions" className={`dashboard-card dashboard-urgent${highlightUrgentActions ? " is-focused" : ""}`}>
          <CardHeading title="Actions prioritaires" subtitle="Les éléments qui nécessitent votre attention" />
          {data.urgent_actions.length ? <div className="dashboard-action-list">
            {data.urgent_actions.map((item) => <button key={item.key} type="button" onClick={() => navigate(item.path, onNavigate)}>
              <span className={`dashboard-action-icon ${item.severity}`}><ActionIcon name={item.key === "maintenance" ? "maintenance" : "note"} /></span>
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
              <ActionIcon name="expand" />
            </button>)}
          </div> : <EmptyState compact icon="inbox" title="Aucune action urgente" description="Aucune échéance ou maintenance critique n’est signalée." />}
        </section>

        <section className="dashboard-card">
          <CardHeading title="Santé des chantiers" subtitle="Classement selon les points d’attention" action="Voir tous les sites" onAction={() => onNavigate("/sites")} />
          {data.project_health.length ? <div className="dashboard-project-list">
            {data.project_health.map((project, index) => <button key={project.id} type="button" onClick={() => setSelectedProjectId(project.id)}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span className="dashboard-project-info">
                <strong>{project.name}</strong>
                <small>{project.equipment_count} équipement(s) · {healthLabels[project.status]}</small>
              </span>
              <em className={`dashboard-project-alert-count ${project.status}`}>{project.alert_count ? `${project.alert_count} alerte(s)` : "Aucune alerte"}</em>
              <ActionIcon name="expand" />
            </button>)}
          </div> : <EmptyState compact icon="location" title="Aucun site actif" description="Les sites actifs apparaîtront ici." />}
        </section>
      </div>

      <div className="dashboard-grid dashboard-secondary-grid">
        <section className="dashboard-card">
          <CardHeading title="Affectation du parc" subtitle={`Répartition des ${data.summary.active_equipment} équipements actifs`} />
          <div className="dashboard-assignment">
            <div className="dashboard-donut" style={{ background: `conic-gradient(${statusColors.assigned} 0 ${assignmentRate}%, #f3ccd6 ${assignmentRate}% 100%)` }}>
              <span><strong>{data.summary.active_equipment.toLocaleString("fr-FR")}</strong><small>équipements</small></span>
            </div>
            <div className="dashboard-status-list">
              {Object.entries(data.equipment_status).map(([key, value]) => <div key={key}>
                <i style={{ backgroundColor: statusColors[key as keyof typeof statusColors] }} />
                <span>{statusLabels[key as keyof typeof statusLabels]}</span>
                <strong>{value.toLocaleString("fr-FR")}</strong>
              </div>)}
            </div>
          </div>
        </section>
        <section className="dashboard-card">
          <CardHeading title="Parc par catégorie" subtitle="Composition de l’inventaire actif" />
          <div className="dashboard-category-grid">{data.equipment_categories.map((item, index) => <div key={item.code}>
            <span className="dashboard-category-icon" style={{ color: categoryColors[index % categoryColors.length], backgroundColor: `${categoryColors[index % categoryColors.length]}14` }}><ActionIcon name="inbox" /></span>
            <span><strong>{item.name}</strong><i><em style={{ width: `${item.total / maxCategory * 100}%`, backgroundColor: categoryColors[index % categoryColors.length] }} /></i></span>
            <b>{item.total.toLocaleString("fr-FR")}</b>
          </div>)}</div>
        </section>
      </div>

      <section className="dashboard-card dashboard-deadlines-card">
        <CardHeading title="Échéances administratives" subtitle="Assurances, cautions et admissions temporaires à anticiper" />
        {data.deadlines.length ? <div className="dashboard-deadline-list">{data.deadlines.map((item) => <button key={`${item.type}-${item.id}`} type="button" onClick={() => onNavigate(item.path)}>
          <span className={`dashboard-deadline-icon ${item.severity}`}><ActionIcon name={deadlineIcon(item.type)} /></span>
          <span><small>{deadlineType(item.type)}</small><strong>{item.label}</strong></span>
          <time dateTime={item.due_on}>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${item.due_on}T00:00:00`))}</time>
          <em className={item.severity}>{deadlineLabel(item.days_remaining)}</em>
          <ActionIcon name="expand" />
        </button>)}</div> : <EmptyState compact icon="history" title="Aucune échéance proche" description="Aucune échéance dans les 90 prochains jours." />}
      </section>

      {selectedProject && <Modal title={`Alertes · ${selectedProject.name}`} onClose={() => setSelectedProjectId(null)}>
        <div className="dashboard-alert-modal">
          <div className={`dashboard-alert-summary ${selectedProject.status}`}>
            <span><ActionIcon name={selectedProject.alert_count ? "note" : "inbox"} /></span>
            <div>
              <strong>{selectedProject.alert_count ? `${selectedProject.alert_count} point(s) d’attention` : "Aucune alerte"}</strong>
              <p>{selectedProject.alert_count ? "Voici précisément ce qui nécessite votre attention sur ce chantier." : "Ce chantier ne présente actuellement aucun point d’attention."}</p>
            </div>
          </div>
          {selectedProject.alerts.length > 0 && <div className="dashboard-alert-detail-list">
            {selectedProject.alerts.map((alert) => {
              const content = <>
                <span className={`dashboard-alert-detail-icon ${alert.severity}`}><ActionIcon name={projectAlertIcon(alert.type)} /></span>
                <span><small>{projectAlertType(alert.type)}</small><strong>{alert.title}</strong><p>{alert.description}</p></span>
                {alert.type !== "responsible" && <ActionIcon name="expand" />}
              </>;

              return alert.type === "responsible"
                ? <div className="dashboard-alert-detail" key={alert.key}>{content}</div>
                : <button className="dashboard-alert-detail" key={alert.key} type="button" onClick={() => { setSelectedProjectId(null); onNavigate(alert.path); }}>{content}</button>;
            })}
          </div>}
        </div>
      </Modal>}

    </main>
  );
}

function CardHeading({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <header className="dashboard-card-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button type="button" onClick={onAction}>{action}<ActionIcon name="expand" /></button>}</header>;
}

function navigate(path: string, onNavigate: (path: string) => void) {
  if (path.startsWith("#")) document.querySelector(path)?.scrollIntoView({ behavior: "smooth" });
  else onNavigate(path);
}

function deadlineLabel(days: number) {
  if (days < 0) {
    const overdueDays = Math.abs(days);
    if (overdueDays >= 730) return `Expirée depuis ${Math.floor(overdueDays / 365)} ans`;
    if (overdueDays >= 365) return "Expirée depuis 1 an";
    return `Expirée depuis ${overdueDays} jour${overdueDays > 1 ? "s" : ""}`;
  }
  if (days === 0) return "Aujourd’hui";
  if (days === 1) return "Demain";
  return `Dans ${days} jours`;
}

function deadlineType(type: DashboardData["deadlines"][number]["type"]) {
  return { insurance: "Assurance", bond: "Caution", temporary_admission: "Admission temporaire" }[type];
}

function deadlineIcon(type: DashboardData["deadlines"][number]["type"]): Parameters<typeof ActionIcon>[0]["name"] {
  return { insurance: "identification", bond: "invoice", temporary_admission: "note" }[type] as Parameters<typeof ActionIcon>[0]["name"];
}

function projectAlertType(type: DashboardData["project_health"][number]["alerts"][number]["type"]) {
  return { insurance: "Assurance", bond: "Caution", responsible: "Organisation du chantier" }[type];
}

function projectAlertIcon(type: DashboardData["project_health"][number]["alerts"][number]["type"]): Parameters<typeof ActionIcon>[0]["name"] {
  return { insurance: "identification", bond: "invoice", responsible: "people" }[type] as Parameters<typeof ActionIcon>[0]["name"];
}

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}
