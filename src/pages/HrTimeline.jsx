import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoster } from "../contexts/RosterContext";
import { useLanguage } from "../contexts/LanguageContext";
import SyncErrorScreen from "../components/SyncErrorScreen";
import { escapeHtml } from "../lib/labelUtils";
import { t as hrt } from "../lib/hrStrings";
import { calendarDiff, todayISO, addMonths, toISODate } from "../lib/dateUtils";
import { deriveStatus, getProbationInfo, getNextAction } from "../lib/employeeStatus";
import { buildTimelineEvents } from "../lib/timeline";
import { MILESTONE_TYPES, REMINDER_OFFSETS } from "../lib/milestoneTypes";
import { useHrTimelineData } from "../lib/useHrTimelineData";
import {
  createHrRecord, confirmEmployee, extendProbation, endEmployment, scheduleReview,
  scheduleActiveReview, clearActiveReview, addMilestone, deleteMilestone,
  addNoteEntry, deleteNoteEntry, updateHrInfo, deleteHrRecord,
} from "../lib/hrTimelineData";
import "./HrTimeline.css";

const STATUS_FILTERS = [
  { value: "all", key: "allStatuses" },
  { value: "active", key: "statusActive" },
  { value: "probation", key: "statusProbation" },
  { value: "action_required", key: "statusActionRequired" },
  { value: "ended", key: "statusEnded" },
];
const CATEGORY_CLASS = { joining: "brass", probation: "teal", confirmed: "teal", ended: "red", anniversary: "teal", custom: "brass" };
const STATUS_BADGE = { active: { key: "statusActive", tone: "teal" }, probation: { key: "statusProbation", tone: "brass" }, action_required: { key: "statusActionRequired", tone: "red" }, ended: { key: "statusEnded", tone: "muted" } };

export default function HrTimeline() {
  const { roster, loaded: rosterLoaded, syncError: rosterError } = useRoster();
  const { recordsById, loaded, syncError } = useHrTimelineData();
  const { lang } = useLanguage();
  const t = (key, vars) => hrt(lang, key, vars);
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    // nothing extra needed — employeeId in the URL is read directly below
  }, [employeeId]);

  if (rosterError || syncError) return <SyncErrorScreen error={rosterError || syncError} />;
  if (!rosterLoaded || !loaded) return null;

  if (employeeId) {
    const emp = roster.find((e) => e.id === employeeId);
    if (!emp) return <div className="hrList-empty">Employee not found in the roster.</div>;
    return <Profile emp={emp} rec={recordsById[emp.id]} t={t} navigate={navigate} />;
  }

  return (
    <List
      roster={roster}
      recordsById={recordsById}
      t={t}
      search={search} setSearch={setSearch}
      statusFilter={statusFilter} setStatusFilter={setStatusFilter}
      navigate={navigate}
    />
  );
}

/* ==================== list ==================== */

function List({ roster, recordsById, t, search, setSearch, statusFilter, setStatusFilter, navigate }) {
  const filtered = useMemo(() => {
    return roster.filter((emp) => {
      const rec = recordsById[emp.id];
      const status = rec ? deriveStatus(rec) : null;
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || emp.nameEn?.toLowerCase().includes(q) || emp.nameAr?.includes(search.trim()) || rec?.jobTitle?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [roster, recordsById, search, statusFilter]);

  function printFullReport() {
    const rows = roster.map((emp) => {
      const rec = recordsById[emp.id];
      const status = rec ? t(STATUS_BADGE[deriveStatus(rec)].key) : "Not set up";
      const tenure = rec ? calendarDiff(rec.joiningDate) : null;
      const tenureStr = tenure ? `${tenure.years ? tenure.years + "y " : ""}${tenure.months}mo` : "—";
      return `<tr><td>#${escapeHtml(emp.id)} — ${escapeHtml(emp.nameEn)}</td><td>${escapeHtml(rec?.jobTitle || "—")}</td><td>${status}</td><td>${tenureStr}</td></tr>`;
    }).join("");
    const setUp = roster.filter((e) => recordsById[e.id]).length;
    document.getElementById("printArea").innerHTML = `
      <div class="rp-brand">MegaLab · HR Timeline</div>
      <h1>HR Timeline — All Employees</h1>
      <p style="font-size:12px;color:#555;margin-bottom:12px;">Printed ${new Date().toLocaleDateString()} · ${setUp}/${roster.length} have a timeline on file</p>
      <table><tr><th>Employee</th><th>Job title</th><th>Status</th><th>Tenure</th></tr>${rows}</table>
    `;
    window.print();
  }

  return (
    <div>
      <div className="hrList-controls">
        <input className="hrList-search" placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="hrList-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
        </select>
        <button className="hrList-reportBtn" onClick={() => navigate("/hr-timeline-insights")}>Insights</button>
        <button className="hrList-reportBtn" onClick={printFullReport} disabled={roster.length === 0}>Print full report</button>
      </div>

      {roster.length === 0 && <div className="hrList-empty">No employees in the roster yet.</div>}
      {roster.length > 0 && filtered.length === 0 && <div className="hrList-empty">No matches.</div>}

      <div className="hrList-grid">
        {filtered.map((emp) => {
          const rec = recordsById[emp.id];
          return <Card key={emp.id} emp={emp} rec={rec} t={t} onClick={() => navigate(`/hr-timeline/${emp.id}`)} />;
        })}
      </div>
    </div>
  );
}

function Card({ emp, rec, t, onClick }) {
  if (!rec) {
    return (
      <button className="hrCard" onClick={onClick}>
        <div className="hrCard-top">
          <div>
            <div className="hrCard-name">{emp.nameEn}</div>
            <div className="hrCard-title">{emp.titleEn}</div>
            <div className="hrCard-id">#{emp.id}</div>
          </div>
        </div>
        <div className="hrCard-noRecord">No timeline set up yet</div>
      </button>
    );
  }

  const status = deriveStatus(rec);
  const nextAction = getNextAction(rec, t);

  return (
    <button className="hrCard" onClick={onClick}>
      <div className="hrCard-top">
        <div>
          <div className="hrCard-name">{emp.nameEn}</div>
          <div className="hrCard-title">{rec.jobTitle}</div>
          <div className="hrCard-id">#{emp.id}</div>
        </div>
        <StatusBadge status={status} t={t} />
      </div>
      <Counter joiningDate={rec.joiningDate} size="md" t={t} />
      <div className="hrCard-at">{t("atCompany")}</div>
      {nextAction && <div className={`hrCard-action ${nextAction.urgent ? "hrCard-action--urgent" : ""}`}>{nextAction.text}</div>}
    </button>
  );
}

function StatusBadge({ status, t }) {
  const meta = STATUS_BADGE[status] || STATUS_BADGE.active;
  return <span className={`hrBadge hrBadge--${meta.tone}`}>{t(meta.key)}</span>;
}

function Counter({ joiningDate, size = "md", t }) {
  const { years, months, days } = calendarDiff(joiningDate);
  const units = [
    { value: years, label: years === 1 ? t("year") : t("years"), show: years > 0 },
    { value: months, label: months === 1 ? t("month") : t("months"), show: months > 0 || years > 0 },
    { value: days, label: days === 1 ? t("day") : t("days"), show: true },
  ].filter((u) => u.show);
  return (
    <div className={`hrCounter hrCounter--${size}`}>
      {units.map((u, i) => (
        <div className="hrCounter-block" key={i}>
          <span className="hrCounter-digits">{String(u.value).padStart(2, "0")}</span>
          <span className="hrCounter-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ==================== profile ==================== */

function Profile({ emp, rec, t, navigate }) {
  const [, forceRerender] = useState(0);
  const refetch = () => forceRerender((n) => n + 1); // onSnapshot already pushes new data; this just nudges local UI state closed
  const [editing, setEditing] = useState(false);

  if (!rec) return <Setup emp={emp} t={t} />;

  const status = deriveStatus(rec);
  const probation = getProbationInfo(rec);

  function printReport() {
    const tenure = calendarDiff(rec.joiningDate);
    const probationRow = status === "probation"
      ? `<tr><th>Probation ends</th><td>${escapeHtml(rec.probation.endDate)}</td><th>Days left</th><td>${probation.daysRemaining}</td></tr>`
      : "";
    const milestonesHtml = (rec.milestones || []).length
      ? rec.milestones.map((m) => `<div class="rp-row">${escapeHtml(m.type === "other" ? m.customLabel : t(`milestoneType_${m.type}`))} — ${escapeHtml(m.date)}</div>`).join("")
      : `<div class="rp-row">None recorded.</div>`;
    const notesHtml = (rec.notesLog || []).length
      ? rec.notesLog.map((n) => `<div class="rp-row">${escapeHtml(n.text)} <span style="color:#888">— ${new Date(n.timestamp).toLocaleDateString()}</span></div>`).join("")
      : `<div class="rp-row">None recorded.</div>`;

    document.getElementById("printArea").innerHTML = `
      <div class="rp-brand">MegaLab · HR Timeline</div>
      <h1>Employee Timeline Report</h1>
      <table>
        <tr><th>Name</th><td>${escapeHtml(emp.nameEn)}</td><th>ID</th><td>#${escapeHtml(emp.id)}</td></tr>
        <tr><th>Job title</th><td>${escapeHtml(rec.jobTitle)}</td><th>Department</th><td>${escapeHtml(rec.department || "—")}</td></tr>
        <tr><th>Joined</th><td>${escapeHtml(rec.joiningDate)}</td><th>Tenure</th><td>${tenure.years ? tenure.years + "y " : ""}${tenure.months}mo ${tenure.days}d</td></tr>
        <tr><th>Status</th><td>${t(STATUS_BADGE[status].key)}</td><th>Manager</th><td>${escapeHtml(rec.manager || "—")}</td></tr>
        ${probationRow}
      </table>
      <h3>Milestones</h3>${milestonesHtml}
      <h3>Notes</h3>${notesHtml}
      <div class="rp-footer"><span>Printed ${new Date().toLocaleDateString()}</span><span>MegaLab HR Timeline</span></div>
    `;
    window.print();
  }

  return (
    <div>
      <div className="hrProfile-toolbar">
        <button className="hrProfile-back" onClick={() => navigate("/hr-timeline")}>← {t("backToList")}</button>
        <div className="hrProfile-toolbarActions">
          <button className="hrBtn hrBtn--ghost" onClick={() => setEditing((v) => !v)}>{t("editEmployee")}</button>
          <button className="hrBtn hrBtn--ghost" onClick={printReport}>{t("print")}</button>
        </div>
      </div>

      <div className="hrProfile-header">
        <div>
          <h1 className="hrProfile-name">{emp.nameEn} <span style={{ fontWeight: 400, fontSize: 14, color: "var(--ink-soft)" }}>{emp.nameAr}</span></h1>
          <p className="hrProfile-title">{rec.jobTitle}</p>
        </div>
        <StatusBadge status={status} t={t} />
      </div>

      {editing ? (
        <EditInfoForm emp={emp} rec={rec} t={t} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="hrCounterCard">
            <Counter joiningDate={rec.joiningDate} size="lg" t={t} />
            <div className="hrCounterCard-at">{t("atCompany")}</div>
          </div>

          {probation && status === "probation" && (
            <div className="hrProbationCard">
              <div className="hrProbationCard-row">
                <span>{t("dayOf", { completed: probation.daysCompleted, total: probation.totalDays })}</span>
                <span>{probation.daysRemaining} {t("daysRemaining")}</span>
              </div>
              <div className="hrProbationCard-bar"><div className="hrProbationCard-fill" style={{ width: `${probation.percent}%` }} /></div>
              {probation.daysRemaining <= 7 && (
                <div className="hrProbationCard-decideSoon">
                  {probation.daysRemaining === 0 ? t("reminderProbationDecideToday") : t("reminderProbationDecideSoon", { days: probation.daysRemaining })}
                </div>
              )}
              <EarlyConfirm empId={emp.id} t={t} />
            </div>
          )}

          {status === "action_required" && <ProbationActionRequired empId={emp.id} rec={rec} t={t} />}
          {status === "active" && <ActiveEmployeeActions empId={emp.id} rec={rec} t={t} />}

          {rec.probation?.history?.length > 0 && (
            <div className="hrHistory">
              <span className="hrHistory-title">{t("probationHistory")}</span>
              {rec.probation.history.map((h, i) => (
                <div key={i} className="hrHistory-row">{t("extendedOn", { date: h.date, newDate: h.newEndDate })}{h.note ? ` — ${h.note}` : ""}</div>
              ))}
            </div>
          )}

          <Timeline emp={emp} rec={rec} t={t} />
          <Milestones empId={emp.id} rec={rec} t={t} />
          <Notes empId={emp.id} rec={rec} t={t} />

          <div className="hrDetails">
            <DetailRow label={t("employeeId")} value={"#" + emp.id} />
            <DetailRow label={t("joiningDate")} value={rec.joiningDate} />
            <DetailRow label={t("phoneNumber")} value={rec.phoneNumber} />
            {rec.department && <DetailRow label={t("department")} value={rec.department} />}
            {rec.email && <DetailRow label={t("emailOptional")} value={rec.email} />}
            {rec.manager && <DetailRow label={t("manager")} value={rec.manager} />}
          </div>

          <DangerZone empId={emp.id} name={emp.nameEn} t={t} navigate={navigate} />
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return <div className="hrDetailRow"><span className="hrDetailRow-label">{label}</span><span>{value}</span></div>;
}

/* ---------- setup (no record yet) ---------- */

function Setup({ emp, t }) {
  const [jobTitle, setJobTitle] = useState(emp.titleEn || "");
  const [joiningDate, setJoiningDate] = useState(todayISO());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [manager, setManager] = useState("");
  const [probationType, setProbationType] = useState("3_months");
  const [customEndDate, setCustomEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await createHrRecord(emp.id, { jobTitle, joiningDate, phoneNumber, department, email, manager, probationType, probationCustomEndDate: customEndDate });
    } catch (err) {
      alert("Couldn't create record: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="hrSetupForm" onSubmit={submit}>
      <h3>{t("newEmployee")} — {emp.nameEn}</h3>
      <div className="hrSetupForm-grid">
        <label className="hrField">{t("jobTitle")}<input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required /></label>
        <label className="hrField">{t("joiningDate")}<input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required /></label>
        <label className="hrField">{t("phoneNumber")}<input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} /></label>
        <label className="hrField">
          {t("probationPeriod")}
          <select value={probationType} onChange={(e) => setProbationType(e.target.value)}>
            <option value="1_month">{t("oneMonth")}</option>
            <option value="3_months">{t("threeMonths")}</option>
            <option value="6_months">{t("sixMonths")}</option>
            <option value="custom">{t("custom")}</option>
          </select>
        </label>
        {probationType === "custom" && (
          <label className="hrField">{t("customEndDate")}<input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} /></label>
        )}
        <div className="hrSetupForm-divider">{t("department")} · {t("emailOptional")} · {t("manager")}</div>
        <label className="hrField">{t("department")}<input value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
        <label className="hrField">{t("emailOptional")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="hrField">{t("manager")}<input value={manager} onChange={(e) => setManager(e.target.value)} /></label>
      </div>
      <div className="hrSetupForm-actions">
        <button type="submit" className="hrBtn hrBtn--primary" disabled={busy}>{busy ? t("saving") : t("save")}</button>
      </div>
    </form>
  );
}

function EditInfoForm({ emp, rec, t, onDone }) {
  const [jobTitle, setJobTitle] = useState(rec.jobTitle || "");
  const [phoneNumber, setPhoneNumber] = useState(rec.phoneNumber || "");
  const [department, setDepartment] = useState(rec.department || "");
  const [email, setEmail] = useState(rec.email || "");
  const [manager, setManager] = useState(rec.manager || "");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateHrInfo(emp.id, { jobTitle, phoneNumber, department, email, manager });
      onDone();
    } catch (err) {
      alert("Couldn't save: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="hrSetupForm" onSubmit={submit}>
      <h3>{t("editEmployee")}</h3>
      <div className="hrSetupForm-grid">
        <label className="hrField">{t("jobTitle")}<input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></label>
        <label className="hrField">{t("phoneNumber")}<input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} /></label>
        <label className="hrField">{t("department")}<input value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
        <label className="hrField">{t("emailOptional")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="hrField">{t("manager")}<input value={manager} onChange={(e) => setManager(e.target.value)} /></label>
      </div>
      <div className="hrSetupForm-actions">
        <button type="button" className="hrBtn hrBtn--ghost" onClick={onDone} disabled={busy}>{t("cancel")}</button>
        <button type="submit" className="hrBtn hrBtn--primary" disabled={busy}>{busy ? t("saving") : t("save")}</button>
      </div>
    </form>
  );
}

/* ---------- probation: early confirm ---------- */

function EarlyConfirm({ empId, t }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try { await confirmEmployee(empId, todayISO()); } finally { setBusy(false); }
  }

  if (!confirming) return <button className="early-confirm__trigger" style={{ marginTop: 14, background: "none", border: "1px solid var(--line-strong)", color: "var(--ink-soft)", borderRadius: "var(--radius-sm)", padding: "8px 14px", fontSize: 12, fontWeight: 600 }} onClick={() => setConfirming(true)}>{t("confirmEarly")}</button>;

  return (
    <div className="hrActionForm">
      <p className="hrActionForm-prompt">{t("confirmEarlyPrompt")}</p>
      <div className="hrActionForm-actions">
        <button className="hrBtn hrBtn--ghost" onClick={() => setConfirming(false)} disabled={busy}>{t("cancel")}</button>
        <button className="hrBtn hrBtn--primary" onClick={handleConfirm} disabled={busy}>{busy ? t("saving") : t("confirmEmployee")}</button>
      </div>
    </div>
  );
}

/* ---------- action required (probation overdue) ---------- */

function ProbationActionRequired({ empId, rec, t }) {
  const [activeAction, setActiveAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const reviewNote = rec.probation?.decision?.reviewDate ? t("reminderReviewScheduled", { date: rec.probation.decision.reviewDate }) : null;

  async function run(fn) {
    setBusy(true);
    try { await fn(); setActiveAction(null); } finally { setBusy(false); }
  }

  return (
    <div className="hrActionRequired">
      <span className="hrActionRequired-label">{t("actionRequired")}</span>
      <p className="hrActionRequired-desc">{t("actionRequiredDesc")}</p>
      {reviewNote && <p className="hrActionRequired-note">{reviewNote}</p>}

      {!activeAction && (
        <div className="hrActionRequired-buttons">
          <button className="hrBtn hrBtn--primary" onClick={() => setActiveAction("confirm")}>{t("confirmEmployee")}</button>
          <button className="hrBtn hrBtn--ghost" onClick={() => setActiveAction("extend")}>{t("extendProbation")}</button>
          <button className="hrBtn hrBtn--ghost" onClick={() => setActiveAction("review")}>{t("scheduleReview")}</button>
          <button className="hrBtn hrBtn--danger" onClick={() => setActiveAction("end")}>{t("endEmployment")}</button>
        </div>
      )}

      {activeAction === "confirm" && (
        <div className="hrActionForm">
          <p className="hrActionForm-prompt">{t("confirmEmployeePrompt")}</p>
          <div className="hrActionForm-actions">
            <button className="hrBtn hrBtn--ghost" onClick={() => setActiveAction(null)} disabled={busy}>{t("cancel")}</button>
            <button className="hrBtn hrBtn--primary" onClick={() => run(() => confirmEmployee(empId, todayISO()))} disabled={busy}>{busy ? t("saving") : t("confirmEmployee")}</button>
          </div>
        </div>
      )}

      {activeAction === "extend" && <ExtendForm rec={rec} t={t} busy={busy} onCancel={() => setActiveAction(null)} onSubmit={(d, note) => run(() => extendProbation(empId, d, note, todayISO()))} />}
      {activeAction === "review" && <ReviewForm t={t} busy={busy} onCancel={() => setActiveAction(null)} onSubmit={(d, note) => run(() => scheduleReview(empId, d, note, todayISO()))} label={t("scheduleReview")} />}
      {activeAction === "end" && <EndForm t={t} busy={busy} onCancel={() => setActiveAction(null)} onSubmit={(d, reason) => run(() => endEmployment(empId, d, reason))} />}
    </div>
  );
}

function ExtendForm({ rec, onSubmit, onCancel, busy, t }) {
  const currentEnd = rec.probation.endDate;
  const [mode, setMode] = useState("1_month");
  const [customDate, setCustomDate] = useState("");
  const [note, setNote] = useState("");

  function computeNewEnd() {
    if (mode === "custom") return customDate;
    if (mode === "2_weeks") { const d = new Date(currentEnd); d.setDate(d.getDate() + 14); return toISODate(d); }
    const months = { "1_month": 1, "3_months": 3 }[mode];
    return toISODate(addMonths(currentEnd, months));
  }
  const newEnd = computeNewEnd();

  return (
    <div className="hrActionForm">
      <p className="hrActionForm-prompt">{t("extendProbationPrompt", { date: currentEnd })}</p>
      <div className="hrActionForm-radios">
        {[["2_weeks", t("twoWeeks")], ["1_month", t("oneMonth")], ["3_months", t("threeMonths")], ["custom", t("custom")]].map(([value, label]) => (
          <label key={value} className="hrRadioPill">
            <input type="radio" name="extend-mode" checked={mode === value} onChange={() => setMode(value)} />{label}
          </label>
        ))}
      </div>
      {mode === "custom" && <label className="hrField">{t("customEndDate")}<input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} /></label>}
      {newEnd && <p className="hrActionForm-preview">{t("newProbationEnd", { date: newEnd })}</p>}
      <label className="hrField">{t("noteOptional")}<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="hrActionForm-actions">
        <button className="hrBtn hrBtn--ghost" onClick={onCancel} disabled={busy}>{t("cancel")}</button>
        <button className="hrBtn hrBtn--primary" onClick={() => onSubmit(newEnd, note)} disabled={busy || !newEnd}>{busy ? t("saving") : t("extendProbation")}</button>
      </div>
    </div>
  );
}

function ReviewForm({ onSubmit, onCancel, busy, t, label }) {
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="hrActionForm">
      <p className="hrActionForm-prompt">{t("scheduleReviewPrompt")}</p>
      <label className="hrField">{t("reviewDate")}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="hrField">{t("noteOptional")}<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="hrActionForm-actions">
        <button className="hrBtn hrBtn--ghost" onClick={onCancel} disabled={busy}>{t("cancel")}</button>
        <button className="hrBtn hrBtn--primary" onClick={() => onSubmit(date, note)} disabled={busy || !date}>{busy ? t("saving") : label}</button>
      </div>
    </div>
  );
}

function EndForm({ onSubmit, onCancel, busy, t }) {
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  return (
    <div className="hrActionForm">
      <p className="hrActionForm-prompt hrActionForm-promptDanger">{t("endEmploymentPrompt")}</p>
      <label className="hrField">{t("endDate")}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="hrField">{t("reasonOptional")}<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <div className="hrActionForm-actions">
        <button className="hrBtn hrBtn--ghost" onClick={onCancel} disabled={busy}>{t("cancel")}</button>
        <button className="hrBtn hrBtn--danger" onClick={() => onSubmit(date, reason)} disabled={busy}>{busy ? t("saving") : t("endEmployment")}</button>
      </div>
    </div>
  );
}

/* ---------- active employee actions ---------- */

function ActiveEmployeeActions({ empId, rec, t }) {
  const [activeAction, setActiveAction] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(fn) {
    setBusy(true);
    try { await fn(); setActiveAction(null); } finally { setBusy(false); }
  }

  return (
    <div className="hrActiveActions">
      {rec.upcomingReview && (
        <div className="hrActiveActions-scheduled">
          <span>{t("reviewScheduledFor", { date: rec.upcomingReview.date })}</span>
          <button className="hrActiveActions-clear" onClick={() => run(() => clearActiveReview(empId))} disabled={busy}>{t("clear")}</button>
        </div>
      )}
      {!activeAction && (
        <div className="hrActiveActions-buttons">
          {!rec.upcomingReview && <button className="hrBtn hrBtn--ghost" onClick={() => setActiveAction("review")}>{t("scheduleReview")}</button>}
          <button className="hrBtn hrBtn--danger" onClick={() => setActiveAction("end")}>{t("endEmployment")}</button>
        </div>
      )}
      {activeAction === "review" && <ReviewForm t={t} busy={busy} onCancel={() => setActiveAction(null)} onSubmit={(d, note) => run(() => scheduleActiveReview(empId, d, note))} label={t("scheduleReview")} />}
      {activeAction === "end" && <EndForm t={t} busy={busy} onCancel={() => setActiveAction(null)} onSubmit={(d, reason) => run(() => endEmployment(empId, d, reason))} />}
    </div>
  );
}

/* ---------- timeline ---------- */

function Timeline({ emp, rec, t }) {
  const [expanded, setExpanded] = useState(false);
  const events = buildTimelineEvents(rec, t);
  if (events.length === 0) return null;
  const isLong = events.length > 7;
  const showList = !isLong || expanded;

  return (
    <div className="hrTimelineBlock">
      <div className="hrTimelineBlock-header">
        <span className="hrTimelineBlock-title">{t("employeeTimeline")}</span>
        {isLong && <button className="hrTimelineBlock-toggle" onClick={() => setExpanded((v) => !v)}>{expanded ? t("timelineShowLess") : t("timelineShowAll", { count: events.length })}</button>}
      </div>
      {showList ? (
        <div>
          {events.map((ev, i) => (
            <div key={i} className={`hrTl-event hrTl-event--${ev.status}`}>
              <div className="hrTl-lineCol">
                <span className={`hrTl-dot hrTl-dot--${CATEGORY_CLASS[ev.category] || "muted"}`} />
                {i < events.length - 1 && <span className="hrTl-connector" />}
              </div>
              <div className="hrTl-content">
                <div className="hrTl-date">{ev.dateISO}</div>
                <div className="hrTl-label">{ev.label}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button className="hrTl-collapsed" onClick={() => setExpanded(true)}>{t("timelineShowAll", { count: events.length })}</button>
      )}
    </div>
  );
}

/* ---------- milestones ---------- */

function Milestones({ empId, rec, t }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("contract_expiry");
  const [customLabel, setCustomLabel] = useState("");
  const [date, setDate] = useState("");
  const [offsets, setOffsets] = useState([...REMINDER_OFFSETS]);
  const [busy, setBusy] = useState(false);
  const milestones = rec.milestones || [];

  function toggleOffset(o) {
    setOffsets((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o].sort((a, b) => b - a)));
  }

  async function handleAdd() {
    if (!date || (type === "other" && !customLabel.trim())) return;
    setBusy(true);
    try {
      await addMilestone(empId, { type, customLabel, date, reminderOffsets: offsets });
      setDate(""); setCustomLabel(""); setAdding(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="hrMilestones">
      <div className="hrMilestones-header">
        <span className="hrMilestones-title">{t("customMilestones")}</span>
        {!adding && <button className="hrMilestones-addBtn" onClick={() => setAdding(true)}>+ {t("addMilestone")}</button>}
      </div>
      {milestones.length === 0 && !adding && <p className="hrMilestones-empty">{t("noMilestones")}</p>}
      <div className="hrMilestones-list">
        {milestones.map((m) => (
          <div key={m.id} className="hrMilestones-item">
            <div>
              <div className="hrMilestones-itemLabel">{m.type === "other" ? m.customLabel : t(`milestoneType_${m.type}`)}</div>
              <div className="hrMilestones-itemDate">{m.date}</div>
            </div>
            <button className="hrMilestones-delete" onClick={() => deleteMilestone(empId, m.id)}>×</button>
          </div>
        ))}
      </div>
      {adding && (
        <div className="hrMilestones-form">
          <label className="hrField">
            {t("milestoneType")}
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {MILESTONE_TYPES.map((mt) => <option key={mt} value={mt}>{t(`milestoneType_${mt}`)}</option>)}
            </select>
          </label>
          {type === "other" && <label className="hrField">{t("milestoneLabel")}<input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} /></label>}
          <label className="hrField">{t("milestoneDate")}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <div className="hrField">
            {t("remindMeBefore")}
            <div className="hrMilestones-offsets">
              {REMINDER_OFFSETS.map((o) => (
                <label key={o} className="hrRadioPill">
                  <input type="checkbox" checked={offsets.includes(o)} onChange={() => toggleOffset(o)} />
                  {o === 0 ? t("onTheDay") : t("daysBefore", { days: o })}
                </label>
              ))}
            </div>
          </div>
          <div className="hrActionForm-actions">
            <button className="hrBtn hrBtn--ghost" onClick={() => setAdding(false)} disabled={busy}>{t("cancel")}</button>
            <button className="hrBtn hrBtn--primary" onClick={handleAdd} disabled={busy}>{busy ? t("saving") : t("save")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- notes ---------- */

function Notes({ empId, rec, t }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = rec.notesLog || [];

  async function handleAdd() {
    if (!draft.trim()) return;
    setBusy(true);
    try { await addNoteEntry(empId, draft); setDraft(""); } finally { setBusy(false); }
  }

  return (
    <div className="hrNotes">
      <span className="hrNotes-title">{t("notes")}</span>
      <div className="hrNotes-add">
        <textarea className="hrNotes-textarea" placeholder={t("notesPlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
        <button className="hrNotes-addBtn" onClick={handleAdd} disabled={busy || !draft.trim()}>{busy ? t("saving") : t("addNote")}</button>
      </div>
      {notes.length === 0 ? <p className="hrNotes-empty">{t("noNotesYet")}</p> : (
        <div className="hrNotes-log">
          {notes.map((n) => (
            <div key={n.id} className="hrNotes-entry">
              <div className="hrNotes-entryHeader">
                <span className="hrNotes-timestamp">{new Date(n.timestamp).toLocaleString()}</span>
                <button className="hrNotes-delete" onClick={() => deleteNoteEntry(empId, n.id)}>×</button>
              </div>
              <div className="hrNotes-entryText">{n.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- danger zone ---------- */

function DangerZone({ empId, name, t, navigate }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try { await deleteHrRecord(empId); navigate("/hr-timeline"); } finally { setBusy(false); }
  }

  return (
    <div className="hrDanger">
      {!confirming ? (
        <button className="hrDanger-trigger" onClick={() => setConfirming(true)}>{t("deleteEmployee")}</button>
      ) : (
        <div className="hrDanger-confirm">
          <p className="hrDanger-prompt">{t("deleteEmployeePrompt", { name })}</p>
          <div className="hrActionForm-actions">
            <button className="hrBtn hrBtn--ghost" onClick={() => setConfirming(false)} disabled={busy}>{t("cancel")}</button>
            <button className="hrBtn hrBtn--danger" onClick={handleDelete} disabled={busy}>{busy ? t("saving") : t("deleteConfirm")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
