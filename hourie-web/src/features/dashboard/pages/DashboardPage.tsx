import { useEffect, useState } from "react";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { getDashboard } from "../api";
import type { DashboardData } from "../types";
import "./dashboard-page.css";

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

  const summaryCards = [
    {
      label: "Actifs suivis",
      value: data.summary.active_equipment,
      meta: "équipements actifs dans l’inventaire",
      icon: "specifications" as const,
      tone: "teal",
      path: "/assets/all",
    },
    {
      label: "Chantiers actifs",
      value: data.summary.active_projects,
      meta: `sur ${data.summary.tracked_projects} chantiers suivis`,
      icon: "location" as const,
      tone: "blue",
      path: "/sites",
    },
    {
      label: "Disponibilité du parc",
      value: `${data.summary.availability_rate}%`,
      meta: `${data.summary.operational_equipment} actifs en bon état confirmé`,
      icon: "maintenance" as const,
      tone: "green",
      path: "/assets/all",
    },
    {
      label: "Points d’attention",
      value: data.summary.attention_points,
      meta: "réparations, entretiens et échéances",
      icon: "note" as const,
      tone: "amber",
      path: "#priority-actions",
    },
  ];

  const qualityItems = [
    { label: "factures manquantes", value: data.data_quality.missing_invoices, icon: "invoice" as const, path: "/assets/all?without_invoice=1" },
    { label: "numéros de série manquants", value: data.data_quality.missing_serials, icon: "identification" as const, path: "/assets/all?missing_serial=1" },
    { label: "actifs sans chantier", value: data.data_quality.missing_projects, icon: "location" as const, path: "/assets/all?unassigned=1" },
    { label: "utilisations actuelles à renseigner", value: data.data_quality.missing_usage_status, icon: "note" as const, path: "/assets/all?missing_usage_status=1" },
  ];

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="section-label">VUE D’ENSEMBLE <span>•</span> RAPPORT D’EXPLOITATION</p>
          <h1>Tableau de bord</h1>
          <p>Pilotez vos chantiers et votre parc d’équipements en un coup d’œil.</p>
          <small>Situation au {formatDate(data.generated_at)} · Direction du matériel · Côte d’Ivoire</small>
        </div>
        <div className="dashboard-heading-actions">
          <span><i aria-hidden="true">✓</i>Données actualisées {formatRelative(data.generated_at)}</span>
          <button className="dashboard-refresh-button" type="button" onClick={load}><ActionIcon name="refresh" />Actualiser</button>
        </div>
      </header>

      <section className="dashboard-overview" aria-label="Synthèse du parc">
        <header>
          <div><h2>Synthèse du parc</h2><p>Indicateurs consolidés sur l’ensemble des chantiers</p></div>
          <span><i />Données en temps réel</span>
        </header>
        <div className="dashboard-kpis">
          {summaryCards.map((card) => (
            <button key={card.label} type="button" onClick={() => navigate(card.path, onNavigate)}>
              <span className={`dashboard-kpi-icon ${card.tone}`}><ActionIcon name={card.icon} /></span>
              <ActionIcon name="expand" />
              <span className="dashboard-kpi-value">
                <strong>{typeof card.value === "number" ? card.value.toLocaleString("fr-FR") : card.value}</strong>
                <small>{card.meta}</small>
              </span>
              <b>{card.label}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-card dashboard-priorities" id="priority-actions">
        <CardHeading title="Actions prioritaires" subtitle="Les éléments qui nécessitent votre attention" />
        {data.priority_actions.length === 0
          ? <EmptyState compact icon="inbox" title="Aucune action urgente" description="Aucune réparation, maintenance ou échéance critique n’est signalée." />
          : <div className="dashboard-priority-list">{data.priority_actions.map((item) => (
            <button key={item.key} type="button" onClick={() => onNavigate(item.path)}>
              <span className={`dashboard-priority-icon ${item.severity}`}><ActionIcon name={priorityIcon(item.key)} /></span>
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
              <ActionIcon name="expand" />
            </button>
          ))}</div>}
      </section>

      <div className="dashboard-detail-grid">
        <section className="dashboard-card dashboard-deadlines">
          <CardHeading title="Échéances administratives" subtitle="Assurances, cautions et AT à contrôler" />
          {data.deadlines.length === 0
            ? <EmptyState compact icon="history" title="Aucune échéance proche" description="Aucune échéance dépassée ou prévue dans les 90 prochains jours." />
            : <div className="dashboard-deadline-list">{data.deadlines.map((item) => (
              <button key={`${item.type}-${item.id}`} type="button" onClick={() => onNavigate(item.path)}>
                <span className={`dashboard-deadline-icon ${item.severity}`}><ActionIcon name={deadlineIcon(item.type)} /></span>
                <span><small>{deadlineType(item.type)}</small><strong>{item.label}</strong></span>
                <time dateTime={item.due_on}>{formatDate(item.due_on)}</time>
                <em className={item.severity}>{deadlineLabel(item.days_remaining)}</em>
                <ActionIcon name="expand" />
              </button>
            ))}</div>}
        </section>

        <section className="dashboard-card dashboard-quality">
          <CardHeading title="Qualité des données" subtitle="Informations à compléter pour fiabiliser l’inventaire" />
          <div className="dashboard-quality-score">
            <span><ActionIcon name="specifications" /></span>
            <p>La complétude globale de votre inventaire est de <strong>{data.data_quality.completeness_percent}%</strong>.</p>
          </div>
          <div className="dashboard-quality-list">{qualityItems.map((item) => (
            <button key={item.label} type="button" onClick={() => onNavigate(item.path)}>
              <ActionIcon name={item.icon} />
              <span><strong>{item.value.toLocaleString("fr-FR")}</strong> {item.label}</span>
              <ActionIcon name="expand" />
            </button>
          ))}</div>
        </section>
      </div>

      <section className="dashboard-card dashboard-activity">
        <CardHeading title="Activité récente" subtitle="Dernières opérations enregistrées" />
        {data.recent_activity.length === 0
          ? <EmptyState compact icon="history" title="Aucune activité récente" description="Les prochaines opérations apparaîtront ici." />
          : <div className="dashboard-activity-list">{data.recent_activity.map((item) => (
            <button key={item.id} type="button" onClick={() => onNavigate(item.path)}>
              <span className={`dashboard-activity-avatar ${activityTone(item.type)}`}>{item.initials}</span>
              <span><strong>{item.title}</strong><small>{item.description}</small><em><ActionIcon name="history" />{formatRelative(item.occurred_at)}</em></span>
            </button>
          ))}</div>}
      </section>
    </main>
  );
}

function CardHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="dashboard-card-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></header>;
}

function navigate(path: string, onNavigate: (path: string) => void) {
  if (path.startsWith("#")) document.querySelector(path)?.scrollIntoView({ behavior: "smooth" });
  else onNavigate(path);
}

function priorityIcon(key: string): Parameters<typeof ActionIcon>[0]["name"] {
  if (key === "repair" || key === "maintenance") return "maintenance";
  return "invoice";
}

function deadlineIcon(type: DashboardData["deadlines"][number]["type"]): Parameters<typeof ActionIcon>[0]["name"] {
  return { insurance: "identification", bond: "invoice", temporary_admission: "note" }[type] as Parameters<typeof ActionIcon>[0]["name"];
}

function deadlineType(type: DashboardData["deadlines"][number]["type"]) {
  return { insurance: "Assurance", bond: "Caution", temporary_admission: "Admission temporaire" }[type];
}

function deadlineLabel(days: number) {
  if (days < 0) return `Expiré depuis ${Math.abs(days).toLocaleString("fr-FR")} j`;
  if (days === 0) return "Aujourd’hui";
  if (days === 1) return "Demain";
  return `J-${days}`;
}

function activityTone(type: string) {
  if (type.includes("maintenance")) return "amber";
  if (type.includes("project") || type.includes("location")) return "teal";
  if (type === "initial_import") return "blue";
  return "violet";
}

function formatDate(value: string) {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDate(value);
}
