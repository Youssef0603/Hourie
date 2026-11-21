import { useEffect, useState } from "react";
import { formatDate as formatApiDate } from "../../../shared/format";
import { localized, operationPhrase as t } from "../../../i18n/operations";
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
      .catch(() => setError(t("Impossible de charger le tableau de bord.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError(t("Impossible de charger le tableau de bord.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <main className="dashboard-page"><LoadingSpinner label={t("Chargement du tableau de bord…")} /></main>;
  if (error || !data) return <main className="dashboard-page"><div className="form-alert" role="alert">{error}</div><button className="secondary-button" type="button" onClick={load}>{t("Réessayer")}</button></main>;

  const summaryCards = [
    {
      label: t("Actifs suivis"),
      value: data.summary.active_equipment,
      meta: t("équipements actifs dans l’inventaire"),
      icon: "specifications" as const,
      tone: "teal",
      path: "/assets/all",
    },
    {
      label: t("Chantiers actifs"),
      value: data.summary.active_projects,
      meta: localized(`sur ${data.summary.tracked_projects} chantiers suivis`, `من أصل ${data.summary.tracked_projects} ورشة عمل متابَعة`),
      icon: "location" as const,
      tone: "blue",
      path: "/sites",
    },
    {
      label: t("Disponibilité du parc"),
      value: `${data.summary.availability_rate}%`,
      meta: localized(`${data.summary.operational_equipment} actifs en bon état confirmé`, `${data.summary.operational_equipment} أصلًا بحالة جيدة مؤكَّدة`),
      icon: "maintenance" as const,
      tone: "green",
      path: "/assets/all",
    },
    {
      label: t("Points d’attention"),
      value: data.summary.attention_points,
      meta: t("réparations, entretiens et échéances"),
      icon: "note" as const,
      tone: "amber",
      path: "#priority-actions",
    },
  ];

  const qualityItems = [
    { label: t("factures manquantes"), value: data.data_quality.missing_invoices, icon: "invoice" as const, path: "/assets/all?without_invoice=1" },
    { label: t("numéros de série manquants"), value: data.data_quality.missing_serials, icon: "identification" as const, path: "/assets/all?missing_serial=1" },
    { label: t("actifs sans chantier"), value: data.data_quality.missing_projects, icon: "location" as const, path: "/assets/all?unassigned=1" },
    { label: t("utilisations actuelles à renseigner"), value: data.data_quality.missing_usage_status, icon: "note" as const, path: "/assets/all?missing_usage_status=1" },
  ];

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="section-label">{t("VUE D’ENSEMBLE")} <span>•</span> {t("RAPPORT D’EXPLOITATION")}</p>
          <h1>{t("Tableau de bord")}</h1>
          <p>{t("Pilotez vos chantiers et votre parc d’équipements en un coup d’œil.")}</p>
          <small>{localized(`Situation au ${formatDate(data.generated_at)}`, `الوضع بتاريخ ${formatDate(data.generated_at)}`)} · {t("Direction du matériel")} · {t("Côte d’Ivoire")}</small>
        </div>
        <div className="dashboard-heading-actions">
          <span><i aria-hidden="true">✓</i>{t("Données actualisées")} {formatRelative(data.generated_at)}</span>
          <button className="dashboard-refresh-button" type="button" onClick={load}><ActionIcon name="refresh" />{t("Actualiser")}</button>
        </div>
      </header>

      <section className="dashboard-overview" aria-label={t("Synthèse du parc")}>
        <header>
          <div><h2>{t("Synthèse du parc")}</h2><p>{t("Indicateurs consolidés sur l’ensemble des chantiers")}</p></div>
          <span><i />{t("Données en temps réel")}</span>
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
        <CardHeading title={t("Actions prioritaires")} subtitle={t("Les éléments qui nécessitent votre attention")} />
        {data.priority_actions.length === 0
          ? <EmptyState compact icon="inbox" title={t("Aucune action urgente")} description={t("Aucune réparation, maintenance ou échéance critique n’est signalée.")} />
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
          <CardHeading title={t("Échéances administratives")} subtitle={t("Assurances, cautions et AT à contrôler")} />
          {data.deadlines.length === 0
            ? <EmptyState compact icon="history" title={t("Aucune échéance proche")} description={t("Aucune échéance dépassée ou prévue dans les 90 prochains jours.")} />
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
          <CardHeading title={t("Qualité des données")} subtitle={t("Informations à compléter pour fiabiliser l’inventaire")} />
          <div className="dashboard-quality-score">
            <span><ActionIcon name="specifications" /></span>
            <p>{t("La complétude globale de votre inventaire est de")} <strong>{data.data_quality.completeness_percent}%</strong>.</p>
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
        <CardHeading title={t("Activité récente")} subtitle={t("Dernières opérations enregistrées")} />
        {data.recent_activity.length === 0
          ? <EmptyState compact icon="history" title={t("Aucune activité récente")} description={t("Les prochaines opérations apparaîtront ici.")} />
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
  return t({ insurance: "Assurance", bond: "Caution", temporary_admission: "Admission temporaire" }[type]);
}

function deadlineLabel(days: number) {
  if (days < 0) return localized(`Expiré depuis ${Math.abs(days).toLocaleString("fr-FR")} j`, `منتهي منذ ${Math.abs(days)} يوم`);
  if (days === 0) return t("Aujourd’hui");
  if (days === 1) return t("Demain");
  return localized(`J-${days}`, `متبقٍّ ${days} يوم`);
}

function activityTone(type: string) {
  if (type.includes("maintenance")) return "amber";
  if (type.includes("project") || type.includes("location")) return "teal";
  if (type === "initial_import") return "blue";
  return "violet";
}

function formatDate(value: string) {
  return formatApiDate(value, { style: "long" });
}

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return t("à l’instant");
  if (minutes < 60) return localized(`il y a ${minutes} min`, `منذ ${minutes} دقيقة`);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return localized(`il y a ${hours} h`, `منذ ${hours} ساعة`);
  const days = Math.round(hours / 24);
  if (days < 7) return localized(`il y a ${days} j`, `منذ ${days} يوم`);
  return formatDate(value);
}
