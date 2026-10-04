import { useNavigate } from "react-router-dom";
import { useRoster } from "../contexts/RosterContext";
import { useHrTimelineData } from "../lib/useHrTimelineData";
import SyncErrorScreen from "../components/SyncErrorScreen";
import { buildReportData } from "../lib/reports";
import { escapeHtml } from "../lib/labelUtils";
import { t as hrt } from "../lib/hrStrings";
import { useLanguage } from "../contexts/LanguageContext";
import "./HrInsights.css";

const STATUS_LABEL_KEY = { active: "statusActive", probation: "statusProbation", action_required: "statusActionRequired", ended: "statusEnded" };

export default function HrInsights() {
  const { roster, loaded: rosterLoaded, syncError: rosterError } = useRoster();
  const { recordsById, loaded, syncError } = useHrTimelineData();
  const { lang } = useLanguage();
  const t = (key, vars) => hrt(lang, key, vars);
  const navigate = useNavigate();

  if (rosterError || syncError) return <SyncErrorScreen error={rosterError || syncError} />;
  if (!rosterLoaded || !loaded) return null;

  const employees = roster
    .filter((emp) => recordsById[emp.id])
    .map((emp) => ({ ...recordsById[emp.id], id: emp.id, nameEn: emp.nameEn }));

  if (employees.length === 0) {
    return (
      <div className="hri">
        <button className="hri-back" onClick={() => navigate("/hr-timeline")}>← {t("backToList")}</button>
        <h1 className="hri-title">Insights</h1>
        <div className="hri-empty">No employees with a timeline set up yet.</div>
      </div>
    );
  }

  const data = buildReportData(employees);
  const employedTotal = data.total - (data.counts.ended || 0);

  return (
    <div className="hri">
      <div className="hri-toolbar">
        <button className="hri-back" onClick={() => navigate("/hr-timeline")}>← {t("backToList")}</button>
        <button className="hri-printBtn" onClick={() => printInsights(data, employedTotal, t)}>Print</button>
      </div>
      <h1 className="hri-title">Insights</h1>
      <p className="hri-meta">{data.total} employee{data.total === 1 ? "" : "s"} tracked · generated {new Date().toLocaleDateString()}</p>

      <div className="hri-summary">
        <SummaryStat label="Total" value={data.total} />
        <SummaryStat label={t(STATUS_LABEL_KEY.active)} value={data.counts.active || 0} />
        <SummaryStat label={t(STATUS_LABEL_KEY.probation)} value={data.counts.probation || 0} />
        <SummaryStat label={t(STATUS_LABEL_KEY.action_required)} value={data.counts.action_required || 0} urgent />
        <SummaryStat label={t(STATUS_LABEL_KEY.ended)} value={data.counts.ended || 0} />
      </div>

      <div className="hri-sectionTitle">Insights</div>
      <div className="hri-insights">
        <InsightCard
          label="Average tenure"
          value={data.avgTenure ? `${data.avgTenure.years}y ${data.avgTenure.months}mo` : "—"}
          hint={`across ${employedTotal} currently employed`}
        />
        <InsightCard
          label="Probation pass rate"
          value={data.probationPassRate !== null ? `${data.probationPassRate}%` : "—"}
          hint={`${data.probationDecided} decided so far`}
        />
      </div>

      {data.departmentBreakdown.length > 0 && (
        <>
          <div className="hri-sectionTitle">By department</div>
          <div className="hri-deptBars">
            {data.departmentBreakdown.map((d) => (
              <div className="hri-deptBar" key={d.department}>
                <span className="hri-deptLabel">{d.department}</span>
                <div className="hri-deptTrack"><div className="hri-deptFill" style={{ width: `${(d.count / employedTotal) * 100}%` }} /></div>
                <span className="hri-deptCount">{d.count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="hri-sectionTitle">Needs attention</div>

      <ReportSection title="Probation ending soon">
        {data.endingSoon.map((e) => (
          <button key={e.id} className="hri-row" onClick={() => navigate(`/hr-timeline/${e.id}`)}>
            <span>{e.name}</span>
            <span className="hri-rowMeta">{e.daysRemaining === 0 ? "Decide today" : `${e.daysRemaining}d left`}</span>
          </button>
        ))}
      </ReportSection>

      <ReportSection title="Upcoming milestones">
        {data.upcomingMilestones.map((m, i) => (
          <button key={i} className="hri-row" onClick={() => navigate(`/hr-timeline/${m.id}`)}>
            <span>{m.name} — {m.milestoneType === "other" ? m.customLabel : t(`milestoneType_${m.milestoneType}`)}</span>
            <span className="hri-rowMeta">{m.date}</span>
          </button>
        ))}
      </ReportSection>
    </div>
  );
}

function SummaryStat({ label, value, urgent }) {
  return (
    <div className={`hri-stat ${urgent && value > 0 ? "hri-stat--urgent" : ""}`}>
      <div className="hri-statValue">{value}</div>
      <div className="hri-statLabel">{label}</div>
    </div>
  );
}

function InsightCard({ label, value, hint }) {
  return (
    <div className="hri-card">
      <div className="hri-cardValue">{value}</div>
      <div className="hri-cardLabel">{label}</div>
      <div className="hri-cardHint">{hint}</div>
    </div>
  );
}

// Fills the shared #printArea and prints — the same mechanism every
// other report in the app uses. Insights is a live dashboard, so a
// direct window.print() on it would print a blank page (the global
// print CSS hides everything except #printArea's contents).
function printInsights(data, employedTotal, t) {
  const statusRow = (key, label) => `<tr><td>${label}</td><td>${data.counts[key] || 0}</td></tr>`;
  const deptRows = data.departmentBreakdown.map((d) => `<tr><td>${escapeHtml(d.department)}</td><td>${d.count}</td></tr>`).join("");
  const endingSoonRows = data.endingSoon.length
    ? data.endingSoon.map((e) => `<div class="rp-row">${escapeHtml(e.name)} — ${e.daysRemaining === 0 ? "Decide today" : `${e.daysRemaining}d left`}</div>`).join("")
    : `<div class="rp-row">None.</div>`;
  const milestoneRows = data.upcomingMilestones.length
    ? data.upcomingMilestones.map((m) => `<div class="rp-row">${escapeHtml(m.name)} — ${escapeHtml(m.milestoneType === "other" ? m.customLabel : t(`milestoneType_${m.milestoneType}`))} (${escapeHtml(m.date)})</div>`).join("")
    : `<div class="rp-row">None.</div>`;

  document.getElementById("printArea").innerHTML = `
    <div class="rp-brand">MegaLab · HR Timeline</div>
    <h1>Insights</h1>
    <p style="font-size:12px;color:#555;margin-bottom:12px;">${data.total} employee(s) tracked · generated ${new Date().toLocaleDateString()}</p>

    <table>
      <tr><th>Status</th><th>Count</th></tr>
      ${statusRow("active", t("statusActive"))}
      ${statusRow("probation", t("statusProbation"))}
      ${statusRow("action_required", t("statusActionRequired"))}
      ${statusRow("ended", t("statusEnded"))}
    </table>

    <table>
      <tr><th>Average tenure</th><td>${data.avgTenure ? `${data.avgTenure.years}y ${data.avgTenure.months}mo` : "—"}</td></tr>
      <tr><th>Probation pass rate</th><td>${data.probationPassRate !== null ? `${data.probationPassRate}%` : "—"} (${data.probationDecided} decided)</td></tr>
    </table>

    ${data.departmentBreakdown.length ? `<h3>By department</h3><table><tr><th>Department</th><th>Count</th></tr>${deptRows}</table>` : ""}

    <h3>Probation ending soon</h3>${endingSoonRows}
    <h3>Upcoming milestones</h3>${milestoneRows}

    <div class="rp-footer"><span>Printed ${new Date().toLocaleDateString()}</span><span>MegaLab HR Timeline</span></div>
  `;
  window.print();
}

function ReportSection({ title, children }) {
  const hasContent = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="hri-section">
      <div className="hri-sectionSub">{title}</div>
      {hasContent ? <div className="hri-sectionList">{children}</div> : <div className="hri-sectionEmpty">None found.</div>}
    </div>
  );
}
