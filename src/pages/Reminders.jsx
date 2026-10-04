import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutstandingItems, TYPE_META } from "../lib/useOutstandingItems";
import { escapeHtml } from "../lib/labelUtils";
import SyncErrorScreen from "../components/SyncErrorScreen";
import "./Reminders.css";

const FILTER_LABEL = {
  all: "Outstanding items",
  label: "Labels needed",
  idBadge: "ID badges needed",
  fileTracker: "File tracker items needed",
  locker: "Locker assignments needed",
  hr: "HR follow-ups needed",
};

export default function Reminders() {
  const { visibleItems, loaded, syncError, dismiss, toggleChecked } = useOutstandingItems();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [copyStatus, setCopyStatus] = useState("");

  if (syncError) return <SyncErrorScreen error={syncError} />;
  if (!loaded) return null;

  const stats = {
    label: visibleItems.filter((r) => r.type === "label").length,
    idBadge: visibleItems.filter((r) => r.type === "idBadge").length,
    fileTracker: visibleItems.filter((r) => r.type === "fileTracker").length,
    locker: visibleItems.filter((r) => r.type === "locker").length,
    hr: visibleItems.filter((r) => r.type === "hr").length,
  };
  const filtered = filter === "all" ? visibleItems : visibleItems.filter((r) => r.type === filter);

  function copyList() {
    const lines = filtered.map((r) => {
      const titlePart = r.emp.titleEn ? ` — ${r.emp.titleEn}` : "";
      const typePart = filter === "all" ? ` [${TYPE_META[r.type].tag}]` : "";
      return `#${r.emp.id} — ${r.emp.nameEn}${titlePart}${typePart}`;
    });
    const text = `${FILTER_LABEL[filter]} (${filtered.length})\n${lines.join("\n")}`;

    navigator.clipboard.writeText(text).then(
      () => { setCopyStatus("Copied ✓"); setTimeout(() => setCopyStatus(""), 2000); },
      () => { setCopyStatus("Couldn't copy — select manually below"); setTimeout(() => setCopyStatus(""), 4000); }
    );
  }

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
        <div className="rm-headerActions">
          {copyStatus && <span className="rm-copyStatus">{copyStatus}</span>}
          <button className="rm-copyBtn" onClick={copyList} disabled={filtered.length === 0}>Copy list</button>
          <button className="rm-printBtn" onClick={printList} disabled={filtered.length === 0}>Print / share</button>
        </div>
      </div>

      <div className="rm-stats">
        <StatCard value={stats.label} label="Labels to print" color="var(--teal-dark)" />
        <StatCard value={stats.idBadge} label="ID badges to issue" color="var(--ink-soft)" />
        <StatCard value={stats.fileTracker} label="Missing file items" color="var(--amber-cap)" />
        <StatCard value={stats.locker} label="Unassigned lockers" color="var(--red-cap)" />
        <StatCard value={stats.hr} label="Probation due soon" color="var(--lavender-cap)" />
      </div>

      <div className="rm-chips">
        <button className={`rm-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>All ({visibleItems.length})</button>
        <button className={`rm-chip ${filter === "label" ? "is-active" : ""}`} onClick={() => setFilter("label")}>Labels</button>
        <button className={`rm-chip ${filter === "idBadge" ? "is-active" : ""}`} onClick={() => setFilter("idBadge")}>ID badge</button>
        <button className={`rm-chip ${filter === "fileTracker" ? "is-active" : ""}`} onClick={() => setFilter("fileTracker")}>File tracker</button>
        <button className={`rm-chip ${filter === "locker" ? "is-active" : ""}`} onClick={() => setFilter("locker")}>Locker</button>
        <button className={`rm-chip ${filter === "hr" ? "is-active" : ""}`} onClick={() => setFilter("hr")}>HR</button>
      </div>

      {filtered.length === 0 ? (
        <div className="rm-empty">Nothing outstanding here.</div>
      ) : (
        <div className="rm-list">
          {filtered.map((r) => {
            const meta = TYPE_META[r.type];
            return (
              <div key={r.id} className={`rm-row ${r.checked ? "rm-row--checked" : ""}`}>
                <button
                  className={`rm-checkBtn ${r.checked ? "is-checked" : ""}`}
                  onClick={() => toggleChecked(r.id, !r.checked)}
                  title="Mark done"
                  aria-label="Mark done"
                >
                  {r.checked ? "✓" : ""}
                </button>
                <button className="rm-rowMain" onClick={() => navigate(`/${meta.path}/${r.emp.id}`)}>
                  <span className="rm-idChip">#{r.emp.id}</span>
                  <span className="rm-name">{r.emp.nameEn}</span>
                  <span className={`rm-tag ${meta.className}`}>{meta.tag}</span>
                  <span className="rm-desc">{r.desc}</span>
                </button>
                <button className="rm-dismissBtn" onClick={() => dismiss(r.id)} title="Dismiss" aria-label="Dismiss">×</button>
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
