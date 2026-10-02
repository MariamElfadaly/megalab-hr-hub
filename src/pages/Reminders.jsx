import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoster } from "../contexts/RosterContext";
import { useFileTrackerData } from "../lib/useFileTrackerData";
import { useLabelsData } from "../lib/useLabelsData";
import { useLockerRoomData } from "../lib/useLockerRoomData";
import { useHrTimelineData } from "../lib/useHrTimelineData";
import { computeStatus } from "../lib/fileTrackerChecklist";
import { deriveStatus, getProbationInfo } from "../lib/employeeStatus";
import { escapeHtml } from "../lib/labelUtils";
import SyncErrorScreen from "../components/SyncErrorScreen";
import "./Reminders.css";

const TYPE_META = {
  label: { tag: "Label", className: "rm-tag-label", path: "labels" },
  fileTracker: { tag: "File tracker", className: "rm-tag-ft", path: "file-tracker" },
  locker: { tag: "Locker", className: "rm-tag-locker", path: "locker-room" },
  hr: { tag: "HR", className: "rm-tag-hr", path: "hr-timeline" },
};

export default function Reminders() {
  const { roster, loaded: rosterLoaded, syncError: rosterError } = useRoster();
  const ft = useFileTrackerData();
  const labels = useLabelsData();
  const locker = useLockerRoomData();
  const hr = useHrTimelineData();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const anyError = rosterError || ft.syncError || labels.syncError || locker.syncError || hr.syncError;
  const allLoaded = rosterLoaded && ft.loaded && labels.loaded && locker.loaded && hr.loaded;

  const items = useMemo(() => {
    if (!allLoaded) return [];
    const assignedLockerIds = new Set();
    locker.state.lockers.forEach((l) => l.employeeIds.forEach((id) => assignedLockerIds.add(id)));
    const excludedFromLocker = new Set(locker.state.excludedIds || []);

    const rows = [];
    roster.forEach((emp) => {
      const ftStatus = computeStatus(ft.recordsById[emp.id]?.checks);
      if (ftStatus.status !== "complete") {
        const missing = ftStatus.mTotal - ftStatus.mDone;
        if (missing > 0) rows.push({ emp, type: "fileTracker", desc: `${missing} required item${missing === 1 ? "" : "s"} missing` });
      }

      if (!labels.recordsById[emp.id]?.qrLink) {
        rows.push({ emp, type: "label", desc: "No Drive link on file" });
      }

      if (!assignedLockerIds.has(emp.id) && !excludedFromLocker.has(emp.id)) {
        rows.push({ emp, type: "locker", desc: "No locker assigned" });
      }

      const rec = hr.recordsById[emp.id];
      if (rec) {
        const status = deriveStatus(rec);
        if (status === "probation") {
          const p = getProbationInfo(rec);
          if (p.daysRemaining <= 7) rows.push({ emp, type: "hr", desc: `Probation ends in ${p.daysRemaining}d` });
        } else if (status === "action_required") {
          rows.push({ emp, type: "hr", desc: "Probation decision overdue" });
        }
      }
    });
    return rows;
  }, [allLoaded, roster, ft.recordsById, labels.recordsById, locker.state, hr.recordsById]);

  const stats = useMemo(() => ({
    label: items.filter((r) => r.type === "label").length,
    fileTracker: items.filter((r) => r.type === "fileTracker").length,
    locker: items.filter((r) => r.type === "locker").length,
    hr: items.filter((r) => r.type === "hr").length,
  }), [items]);

  const filtered = filter === "all" ? items : items.filter((r) => r.type === filter);

  if (anyError) return <SyncErrorScreen error={anyError} />;
  if (!allLoaded) return null;

  function printList() {
    const rows = filtered.map((r) => `<tr><td>#${escapeHtml(r.emp.id)} — ${escapeHtml(r.emp.nameEn)}</td><td>${TYPE_META[r.type].tag}</td><td>${escapeHtml(r.desc)}</td></tr>`).join("");
    document.getElementById("printArea").innerHTML = `
      <div class="rp-brand">MegaLab · Action items</div>
      <h1>Outstanding Work</h1>
      <p style="font-size:12px;color:#555;margin-bottom:12px;">Printed ${new Date().toLocaleDateString()} · ${filtered.length} item(s)</p>
      <table><tr><th>Employee</th><th>System</th><th>Issue</th></tr>${rows}</table>
    `;
    window.print();
  }

  return (
    <div className="rm">
      <div className="rm-header">
        <div>
          <p className="rm-eyebrow">Outstanding work</p>
          <h2 className="rm-title">Action items</h2>
        </div>
        <button className="rm-printBtn" onClick={printList} disabled={filtered.length === 0}>Print / share</button>
      </div>

      <div className="rm-stats">
        <StatCard value={stats.label} label="Labels to print" color="var(--teal-dark)" />
        <StatCard value={stats.fileTracker} label="Missing file items" color="var(--amber-cap)" />
        <StatCard value={stats.locker} label="Unassigned lockers" color="var(--red-cap)" />
        <StatCard value={stats.hr} label="Probation due soon" color="var(--lavender-cap)" />
      </div>

      <div className="rm-chips">
        <button className={`rm-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>All ({items.length})</button>
        <button className={`rm-chip ${filter === "label" ? "is-active" : ""}`} onClick={() => setFilter("label")}>Labels</button>
        <button className={`rm-chip ${filter === "fileTracker" ? "is-active" : ""}`} onClick={() => setFilter("fileTracker")}>File tracker</button>
        <button className={`rm-chip ${filter === "locker" ? "is-active" : ""}`} onClick={() => setFilter("locker")}>Locker</button>
        <button className={`rm-chip ${filter === "hr" ? "is-active" : ""}`} onClick={() => setFilter("hr")}>HR</button>
      </div>

      {filtered.length === 0 ? (
        <div className="rm-empty">Nothing outstanding here.</div>
      ) : (
        <div className="rm-list">
          {filtered.map((r, i) => {
            const meta = TYPE_META[r.type];
            return (
              <div key={i} className="rm-row">
                <span className="rm-idChip">#{r.emp.id}</span>
                <span className="rm-name">{r.emp.nameEn}</span>
                <span className={`rm-tag ${meta.className}`}>{meta.tag}</span>
                <span className="rm-desc">{r.desc}</span>
                <button className="rm-openBtn" onClick={() => navigate(`/${meta.path}/${r.emp.id}`)}>Open →</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="rm-statCard">
      <div className="rm-statValue" style={{ color }}>{value}</div>
      <div className="rm-statLabel">{label}</div>
    </div>
  );
}
