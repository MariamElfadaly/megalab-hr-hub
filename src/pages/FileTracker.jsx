import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoster } from "../contexts/RosterContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useFileTrackerData } from "../lib/useFileTrackerData";
import SyncErrorScreen from "../components/SyncErrorScreen";
import { escapeHtml } from "../lib/labelUtils";
import {
  CHECKLIST,
  MANDATORY_KEYS,
  OPTIONAL_KEYS,
  computeStatus,
  tenureString,
} from "../lib/fileTrackerChecklist";
import "./FileTracker.css";

const STATUS_COLOR = {
  complete: "var(--green-cap)",
  progress: "var(--amber-cap)",
  empty: "var(--red-cap)",
};

export default function FileTracker() {
  const { roster, loaded: rosterLoaded, syncError: rosterError } = useRoster();
  const { recordsById, loaded, syncError, toggleCheck, updateField } = useFileTrackerData();
  const { lang } = useLanguage();
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);

  // Cross-navigation entry point: if the URL names an employee (e.g.
  // arriving from another module's "jump back here" link), open their
  // card automatically instead of landing on a flat unopened list.
  useEffect(() => {
    if (employeeId) setOpenId(employeeId);
  }, [employeeId]);

  // Either data source failing blocks the whole section — never show
  // a partial/empty view when one half of the picture is unreliable.
  if (rosterError || syncError) return <SyncErrorScreen error={rosterError || syncError} />;
  if (!rosterLoaded || !loaded) return null;

  const complete = roster.filter((e) => computeStatus(recordsById[e.id]?.checks).status === "complete").length;
  const target = roster.length || 1;
  const pct = Math.min(100, Math.round((complete / target) * 100));

  function printEmployeeReport(emp) {
    const record = recordsById[emp.id] ?? {};
    const status = computeStatus(record.checks);
    const checks = record.checks || {};
    const name = lang === "ar" ? (emp.nameAr || emp.nameEn) : (emp.nameEn || emp.nameAr);
    const statusLabel = status.status === "complete" ? "Complete" : status.status === "progress" ? "In progress" : "Not started";
    const tenure = record.startDate ? tenureString(record.startDate) : "";

    const missingEmp = CHECKLIST.filter((c) => c.resp === "employee" && c.mandatory && !checks[c.key]).map((c) => c.key);
    const missingLab = CHECKLIST.filter((c) => c.resp === "company" && !checks[c.key]).map((c) => c.key);
    const missingCount = missingEmp.length + missingLab.length;

    const renderRows = (keys, showReqTag) => keys.map((k) => {
      const item = CHECKLIST.find((c) => c.key === k);
      const label = lang === "ar" ? item.ar : item.en;
      const tag = showReqTag ? `<span class="tag ${item.mandatory ? "req" : ""}">${item.mandatory ? "Required" : "Optional"}</span>` : "";
      return `<div class="doc-row"><span class="box">☐</span><span class="name">${escapeHtml(label)}</span>${tag}</div>`;
    }).join("");

    const renderSection = (keys, title, showReqTag) => {
      if (!keys.length) return "";
      return `<div class="sec-head">${title}<span class="count">${keys.length}</span></div>${renderRows(keys, showReqTag)}`;
    };

    const cutBlock = missingLab.length
      ? `<div class="cutrule"><span>Cut here</span></div><div class="repeat-line">${escapeHtml(name)} · #${escapeHtml(emp.id)}</div>`
      : "";

    const bodyHTML = missingCount
      ? renderSection(missingEmp, "Missing from employee", false) + cutBlock + renderSection(missingLab, "Missing from lab", true)
      : `<div class="clear-line">✓ All items on file</div>`;

    document.getElementById("printArea").innerHTML = `
      <div class="doc-brand">MegaLab · File Tracker</div>
      <h1 class="doc-title">Employee File Report</h1>
      <table class="info-table">
        <tr><th>Employee</th><td>${escapeHtml(name)}</td><th>ID</th><td>#${escapeHtml(emp.id)}</td></tr>
        <tr><th>Start date</th><td>${escapeHtml(record.startDate) || "Not set"}</td><th>Tenure</th><td>${escapeHtml(tenure) || "Not set"}</td></tr>
        <tr><th>Status</th><td colspan="3">${statusLabel} — ${status.mDone}/${status.mTotal} required on file</td></tr>
      </table>
      ${bodyHTML}
      <div class="doc-footer"><span>Printed ${new Date().toLocaleDateString()}</span><span>MegaLab File Tracker</span></div>
    `;
    window.print();
  }

  function printFullReport() {
    const rows = roster.map((emp) => {
      const status = computeStatus(recordsById[emp.id]?.checks);
      const name = lang === "ar" ? (emp.nameAr || emp.nameEn) : (emp.nameEn || emp.nameAr);
      const statusLabel = status.status === "complete" ? "Complete" : status.status === "progress" ? "In progress" : "Not started";
      return `<tr>
        <td>#${escapeHtml(emp.id)} — ${escapeHtml(name)}</td>
        <td>${statusLabel}</td>
        <td>${status.mDone}/${status.mTotal}</td>
        <td>${status.oDone}/${status.oTotal}</td>
      </tr>`;
    }).join("");

    document.getElementById("printArea").innerHTML = `
      <div class="rpt-h">
        <div><h1>Compliance Report — All Employees</h1></div>
        <div class="meta">Printed: ${new Date().toLocaleDateString()}<br>${complete}/${roster.length} complete</div>
      </div>
      <table class="rpt-table">
        <thead><tr><th>Employee</th><th>Status</th><th>Required</th><th>Optional</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    window.print();
  }

  return (
    <div>
      <div className="ft-overview">
        <div>
          <p className="ft-eyebrow">Onboarding compliance</p>
          <h2 className="ft-overviewNumber">
            {complete} <span>/ {roster.length} complete</span>
          </h2>
        </div>
        <div className="ft-bar">
          <div className="ft-barFill" style={{ width: `${pct}%` }} />
        </div>
        <button className="ft-fullReportBtn" onClick={printFullReport} disabled={roster.length === 0}>
          Print full report
        </button>
      </div>

      {roster.length === 0 ? (
        <div className="ft-empty">No employees in the roster yet.</div>
      ) : (
        <div className="ft-list">
          {roster.map((emp) => {
            const record = recordsById[emp.id] ?? {};
            const status = computeStatus(record.checks);
            const isOpen = openId === emp.id;
            const primaryName = lang === "ar" ? emp.nameAr || emp.nameEn : emp.nameEn || emp.nameAr;
            const secondaryName = lang === "ar" ? emp.nameEn : emp.nameAr;

            return (
              <div key={emp.id} className={`ft-card ft-status-${status.status}`}>
                <button className="ft-cardHead" onClick={() => setOpenId(isOpen ? null : emp.id)}>
                  <span className="ft-idChip">#{emp.id}</span>
                  <span className="ft-names">
                    <span className="ft-nameEn">{primaryName || "—"}</span>
                    {secondaryName && <span className="ft-nameAr">{secondaryName}</span>}
                  </span>
                  <span className="ft-meta">
                    {status.mDone}/{status.mTotal} required · {status.oDone}/{status.oTotal} optional
                  </span>
                  <span className="ft-statusChip" style={{ color: STATUS_COLOR[status.status] }}>
                    ● {status.status === "complete" ? "Complete" : status.status === "progress" ? "In progress" : "Not started"}
                  </span>
                </button>

                {isOpen && (
                  <div className="ft-cardBody">
                    <button className="ft-printBtn" onClick={(e) => { e.stopPropagation(); printEmployeeReport(emp); }}>
                      Print report
                    </button>
                    <div className="ft-field">
                      <label>Start date</label>
                      <input
                        type="date"
                        value={record.startDate || ""}
                        onChange={(e) => updateField(emp.id, "startDate", e.target.value)}
                      />
                      {record.startDate && (
                        <span className="ft-tenure">Tenure: {tenureString(record.startDate)}</span>
                      )}
                    </div>

                    <div className="ft-checkCols">
                      <ChecklistGroup
                        title="Required"
                        keys={MANDATORY_KEYS}
                        record={record}
                        lang={lang}
                        onToggle={(key, checked) => toggleCheck(emp.id, key, checked)}
                        onField={(field, value) => updateField(emp.id, field, value)}
                        onNavigate={(path) => navigate(path)}
                        empId={emp.id}
                      />
                      <ChecklistGroup
                        title="Optional"
                        keys={OPTIONAL_KEYS}
                        record={record}
                        lang={lang}
                        onToggle={(key, checked) => toggleCheck(emp.id, key, checked)}
                        onField={(field, value) => updateField(emp.id, field, value)}
                        onNavigate={(path) => navigate(path)}
                        empId={emp.id}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Checklist keys that correspond to another module — clicking their
// "Open" button jumps straight there, pre-loaded for this employee.
const CROSS_NAV = {
  c25: "locker-room", // Locker
  c26: "labels", // Name Label
};

function ChecklistGroup({ title, keys, record, lang, onToggle, onField, onNavigate, empId }) {
  const checks = record.checks || {};
  return (
    <div className="ft-checkGroup">
      <h4>{title}</h4>
      {keys.map((k) => {
        const item = CHECKLIST.find((c) => c.key === k);
        const checked = !!checks[k];
        const label = lang === "ar" ? item.ar : item.en;
        const subLabel = lang === "ar" ? item.en : item.ar;
        const crossNavTarget = CROSS_NAV[k];
        return (
          <label key={k} className="ft-checkItem">
            <input type="checkbox" checked={checked} onChange={(e) => onToggle(k, e.target.checked)} />
            <span className="ft-checkLabel">
              <span className="ft-checkEn">{label}</span>
              <span className="ft-checkAr">{subLabel}</span>
            </span>
            <span className={`ft-respTag ft-resp-${item.resp}`}>{item.resp === "company" ? "Lab" : "Employee"}</span>
            {crossNavTarget && (
              <button
                type="button"
                className="ft-crossNavBtn"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate(`/${crossNavTarget}/${empId}`); }}
              >
                Open →
              </button>
            )}
            {item.hasNumber && checked && (
              <input
                type="text"
                className="ft-numInput"
                placeholder={item.numberField === "uniformNumber" ? "Uniform #" : "Locker #"}
                value={record[item.numberField] || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onField(item.numberField, e.target.value)}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
