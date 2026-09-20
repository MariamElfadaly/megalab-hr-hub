import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRoster } from "../contexts/RosterContext";
import { useHrTimelineData } from "../lib/useHrTimelineData";
import SyncErrorScreen from "../components/SyncErrorScreen";
import { todayISO, calendarDiff, probationProgress } from "../lib/dateUtils";
import { escapeHtml } from "../lib/labelUtils";
import {
  createHrRecord, confirmEmployee, extendProbation, endEmployment, scheduleReview,
  addMilestone, deleteMilestone, addNoteEntry, deleteNoteEntry,
} from "../lib/hrTimelineData";
import "./HrTimeline.css";

const STATUS_LABEL = {
  probation: "Probation", active: "Active", action_required: "Action needed", ended: "Ended",
};
const STATUS_COLOR = {
  probation: "var(--amber-cap)", active: "var(--green-cap)", action_required: "var(--red-cap)", ended: "var(--ink-soft)",
};

export default function HrTimeline() {
  const { roster, loaded: rosterLoaded, syncError: rosterError } = useRoster();
  const { recordsById, loaded, syncError } = useHrTimelineData();
  const { employeeId } = useParams();
  const [selectedId, setSelectedId] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (employeeId) { setSelectedId(employeeId); setShowSetup(false); }
  }, [employeeId]);

  if (rosterError || syncError) return <SyncErrorScreen error={rosterError || syncError} />;
  if (!rosterLoaded || !loaded) return null;

  function printFullReport() {
    const rows = roster.map((emp) => {
      const rec = recordsById[emp.id];
      const status = rec ? STATUS_LABEL[rec.status] : "Not set up";
      const tenure = rec ? calendarDiff(rec.joiningDate) : null;
      const tenureStr = tenure ? `${tenure.years ? tenure.years + "y " : ""}${tenure.months}mo` : "—";
      return `<tr>
        <td>#${escapeHtml(emp.id)} — ${escapeHtml(emp.nameEn)}</td>
        <td>${escapeHtml(rec?.jobTitle || "—")}</td>
        <td>${status}</td>
        <td>${tenureStr}</td>
      </tr>`;
    }).join("");
    const setUp = roster.filter((e) => recordsById[e.id]).length;

    document.getElementById("printArea").innerHTML = `
      <div class="rp-brand">MegaLab · HR Timeline</div>
      <h1>HR Timeline — All Employees</h1>
      <p style="font-size:12px;color:#555;margin-bottom:12px;">Printed ${new Date().toLocaleDateString()} · ${setUp}/${roster.length} have a timeline on file</p>
      <table>
        <tr><th>Employee</th><th>Job title</th><th>Status</th><th>Tenure</th></tr>
        ${rows}
      </table>
    `;
    window.print();
  }

  const selectedEmp = roster.find((e) => e.id === selectedId) || null;
  const selectedRec = selectedId ? recordsById[selectedId] : null;

  return (
    <div className="hr-layout">
      <div className="hr-listCol">
        <button className="hr-fullReportBtn" onClick={printFullReport} disabled={roster.length === 0}>
          Print full report
        </button>
        <div className="hr-list">
          {roster.length === 0 && <div className="hr-empty">No employees in the roster yet.</div>}
        {roster.map((emp) => {
          const rec = recordsById[emp.id];
          return (
            <button
              key={emp.id}
              className={"hr-row" + (selectedId === emp.id ? " is-active" : "")}
              onClick={() => { setSelectedId(emp.id); setShowSetup(false); }}
            >
              <span className="hr-idChip">#{emp.id}</span>
              <span className="hr-name">{emp.nameEn}</span>
              {rec ? (
                <span className="hr-statusChip" style={{ color: STATUS_COLOR[rec.status] }}>● {STATUS_LABEL[rec.status]}</span>
              ) : (
                <span className="hr-statusChip hr-noRecord">Not set up</span>
              )}
            </button>
          );
        })}
        </div>
      </div>

      <div className="hr-detail">
        {!selectedEmp ? (
          <div className="hr-empty">Select an employee.</div>
        ) : !selectedRec ? (
          <SetupPanel emp={selectedEmp} show={showSetup} onShow={() => setShowSetup(true)} />
        ) : (
          <DetailPanel emp={selectedEmp} rec={selectedRec} />
        )}
      </div>
    </div>
  );
}

function SetupPanel({ emp, show, onShow }) {
  const [jobTitle, setJobTitle] = useState(emp.titleEn || "");
  const [joiningDate, setJoiningDate] = useState(todayISO());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [manager, setManager] = useState("");
  const [probationType, setProbationType] = useState("3_months");
  const [busy, setBusy] = useState(false);

  if (!show) {
    return (
      <div className="hr-empty">
        <p>{emp.nameEn} doesn't have an HR Timeline record yet.</p>
        <button className="hr-primaryBtn" onClick={onShow}>Set up their timeline</button>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await createHrRecord(emp.id, { jobTitle, joiningDate, phoneNumber, department, email, manager, probationType });
    } catch (err) {
      alert("Couldn't create record: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="hr-form" onSubmit={submit}>
      <h3>Set up {emp.nameEn}'s timeline</h3>
      <label>Job title<input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required /></label>
      <label>Joining date<input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} required /></label>
      <label>Phone<input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} /></label>
      <label>Department<input value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Manager<input value={manager} onChange={(e) => setManager(e.target.value)} /></label>
      <label>
        Probation length
        <select value={probationType} onChange={(e) => setProbationType(e.target.value)}>
          <option value="1_month">1 month</option>
          <option value="3_months">3 months</option>
          <option value="6_months">6 months</option>
        </select>
      </label>
      <button className="hr-primaryBtn" disabled={busy}>{busy ? "Creating…" : "Create timeline"}</button>
    </form>
  );
}

function DetailPanel({ emp, rec }) {
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [milestoneDate, setMilestoneDate] = useState(todayISO());
  const [milestoneLabel, setMilestoneLabel] = useState("");

  const tenure = calendarDiff(rec.joiningDate);
  const progress = rec.status === "probation" ? probationProgress(rec.probation.startDate, rec.probation.endDate) : null;

  async function doConfirm() {
    if (!confirm(`Confirm ${emp.nameEn} as a permanent employee today?`)) return;
    setBusy(true);
    try { await confirmEmployee(emp.id, todayISO()); } finally { setBusy(false); }
  }

  async function doExtend() {
    const weeks = prompt("Extend probation by how many weeks?", "4");
    if (!weeks) return;
    const newEnd = new Date(rec.probation.endDate);
    newEnd.setDate(newEnd.getDate() + Number(weeks) * 7);
    setBusy(true);
    try { await extendProbation(emp.id, newEnd.toISOString().slice(0, 10), `Extended ${weeks} week(s)`, todayISO()); } finally { setBusy(false); }
  }

  async function doEnd() {
    if (!confirm(`End ${emp.nameEn}'s employment? This is recorded permanently on their timeline.`)) return;
    setBusy(true);
    try { await endEmployment(emp.id, todayISO(), null); } finally { setBusy(false); }
  }

  async function submitNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    await addNoteEntry(emp.id, noteText);
    setNoteText("");
  }

  async function submitMilestone(e) {
    e.preventDefault();
    if (!milestoneLabel.trim()) return;
    await addMilestone(emp.id, { type: "other", customLabel: milestoneLabel, date: milestoneDate });
    setMilestoneLabel("");
  }

  function printReport() {
    const name = emp.nameEn || emp.nameAr;
    const probationRow = rec.status === "probation"
      ? `<tr><th>Probation ends</th><td>${escapeHtml(rec.probation.endDate)}</td><th>Days left</th><td>${progress.daysRemaining}</td></tr>`
      : "";

    const milestonesHtml = (rec.milestones || []).length
      ? (rec.milestones || []).map((m) => `<div class="rp-row">${escapeHtml(m.customLabel || m.type)} — ${escapeHtml(m.date)}${m.note ? " · " + escapeHtml(m.note) : ""}</div>`).join("")
      : `<div class="rp-row">None recorded.</div>`;

    const notesHtml = (rec.notesLog || []).length
      ? (rec.notesLog || []).map((n) => `<div class="rp-row">${escapeHtml(n.text)} <span style="color:#888">— ${new Date(n.timestamp).toLocaleDateString()}</span></div>`).join("")
      : `<div class="rp-row">None recorded.</div>`;

    document.getElementById("printArea").innerHTML = `
      <div class="rp-brand">MegaLab · HR Timeline</div>
      <h1>Employee Timeline Report</h1>
      <table>
        <tr><th>Name</th><td>${escapeHtml(name)}</td><th>ID</th><td>#${escapeHtml(emp.id)}</td></tr>
        <tr><th>Job title</th><td>${escapeHtml(rec.jobTitle)}</td><th>Department</th><td>${escapeHtml(rec.department || "—")}</td></tr>
        <tr><th>Joined</th><td>${escapeHtml(rec.joiningDate)}</td><th>Tenure</th><td>${tenure.years ? tenure.years + "y " : ""}${tenure.months}mo ${tenure.days}d</td></tr>
        <tr><th>Status</th><td>${STATUS_LABEL[rec.status]}</td><th>Manager</th><td>${escapeHtml(rec.manager || "—")}</td></tr>
        ${probationRow}
      </table>
      <h3>Milestones</h3>
      ${milestonesHtml}
      <h3>Notes</h3>
      ${notesHtml}
      <div class="rp-footer"><span>Printed ${new Date().toLocaleDateString()}</span><span>MegaLab HR Timeline</span></div>
    `;
    window.print();
  }

  return (
    <div>
      <h3>{emp.nameEn} <span className="hr-nameAr">{emp.nameAr}</span></h3>
      <p className="hr-jobTitle">{rec.jobTitle} {rec.department && `· ${rec.department}`}</p>
      <button className="hr-printBtn" onClick={printReport}>Print report</button>

      <div className="hr-statusBlock">
        <span className="hr-statusChip" style={{ color: STATUS_COLOR[rec.status] }}>● {STATUS_LABEL[rec.status]}</span>
        <span className="hr-tenure">{tenure.years ? `${tenure.years}y ` : ""}{tenure.months}mo {tenure.days}d tenure</span>
      </div>

      {rec.status === "probation" && progress && (
        <div className="hr-progressBlock">
          <div className="hr-bar"><div className="hr-barFill" style={{ width: `${progress.percent}%` }} /></div>
          <p className="hr-progressText">{progress.daysRemaining} day(s) left · ends {rec.probation.endDate}</p>
          <div className="hr-actions">
            <button onClick={doConfirm} disabled={busy} className="hr-actionBtn hr-actionGood">Confirm</button>
            <button onClick={doExtend} disabled={busy} className="hr-actionBtn">Extend</button>
            <button onClick={doEnd} disabled={busy} className="hr-actionBtn hr-actionBad">End employment</button>
          </div>
        </div>
      )}

      {rec.status === "active" && (
        <div className="hr-actions">
          <button onClick={doEnd} disabled={busy} className="hr-actionBtn hr-actionBad">End employment</button>
        </div>
      )}

      <div className="hr-infoGrid">
        {rec.phoneNumber && <div><label>Phone</label><span>{rec.phoneNumber}</span></div>}
        {rec.email && <div><label>Email</label><span>{rec.email}</span></div>}
        {rec.manager && <div><label>Manager</label><span>{rec.manager}</span></div>}
        <div><label>Joined</label><span>{rec.joiningDate}</span></div>
      </div>

      <div className="hr-section">
        <h4>Milestones</h4>
        {(rec.milestones || []).length === 0 && <p className="hr-muted">None yet.</p>}
        {(rec.milestones || []).map((m) => (
          <div key={m.id} className="hr-listRow">
            <span>{m.customLabel || m.type} — {m.date}</span>
            <button className="hr-deleteBtn" onClick={() => deleteMilestone(emp.id, m.id)}>✕</button>
          </div>
        ))}
        <form className="hr-inlineForm" onSubmit={submitMilestone}>
          <input placeholder="Milestone label" value={milestoneLabel} onChange={(e) => setMilestoneLabel(e.target.value)} />
          <input type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} />
          <button className="hr-smallBtn">Add</button>
        </form>
      </div>

      <div className="hr-section">
        <h4>Notes</h4>
        {(rec.notesLog || []).length === 0 && <p className="hr-muted">None yet.</p>}
        {(rec.notesLog || []).map((n) => (
          <div key={n.id} className="hr-listRow">
            <span>{n.text} <span className="hr-muted">— {new Date(n.timestamp).toLocaleDateString()}</span></span>
            <button className="hr-deleteBtn" onClick={() => deleteNoteEntry(emp.id, n.id)}>✕</button>
          </div>
        ))}
        <form className="hr-inlineForm" onSubmit={submitNote}>
          <input placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} style={{ flex: 1 }} />
          <button className="hr-smallBtn">Add</button>
        </form>
      </div>
    </div>
  );
}
