import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRoster } from "../contexts/RosterContext";
import { useLockerRoomData } from "../lib/useLockerRoomData";
import SyncErrorScreen from "../components/SyncErrorScreen";
import { escapeHtml } from "../lib/labelUtils";
import "./LockerRoom.css";

const DOOR_COLOR = { empty: "#3B4A52", partial: "#D98E3B", full: "#C1440E" };

export default function LockerRoom() {
  const { roster, loaded: rosterLoaded, syncError: rosterError, findById } = useRoster();
  const { state, setState, loaded, syncError } = useLockerRoomData();
  const { employeeId } = useParams();

  const [activeLockerId, setActiveLockerId] = useState(null);
  const [query, setQuery] = useState("");
  const [pickerFor, setPickerFor] = useState(null); // locker id currently picking an employee for
  const [pickerQuery, setPickerQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [countInput, setCountInput] = useState(String(state.lockerCount));

  const assignedIds = useMemo(() => {
    const s = new Set();
    state.lockers.forEach((l) => l.employeeIds.forEach((id) => s.add(id)));
    return s;
  }, [state.lockers]);

  const unassigned = useMemo(
    () => roster.filter((e) => !assignedIds.has(e.id) && !(state.excludedIds || []).includes(e.id)),
    [roster, assignedIds, state.excludedIds]
  );

  const excluded = useMemo(
    () => roster.filter((e) => (state.excludedIds || []).includes(e.id)),
    [roster, state.excludedIds]
  );

  const activeLocker = state.lockers.find((l) => l.id === activeLockerId) || null;

  // Cross-navigation entry point: arriving with an employee named in the
  // URL either opens the locker they're already in, or drops their name
  // into search so they're easy to find and assign.
  useEffect(() => {
    if (!employeeId || !loaded) return;
    const existingLocker = state.lockers.find((l) => l.employeeIds.includes(employeeId));
    if (existingLocker) {
      setActiveLockerId(existingLocker.id);
    } else {
      const emp = findById(employeeId);
      if (emp) setQuery(emp.nameEn || emp.nameAr || "");
    }
  }, [employeeId, loaded, state.lockers, findById]);

  const stats = useMemo(() => {
    const assignedLockers = state.lockers.filter((l) => l.employeeIds.length > 0).length;
    const full = state.lockers.filter((l) => l.employeeIds.length >= l.capacity).length;
    const totalCapacity = state.lockers.reduce((sum, l) => sum + l.capacity, 0);
    const totalFilled = state.lockers.reduce((sum, l) => sum + l.employeeIds.length, 0);
    const lockersWithSpace = state.lockers.filter((l) => l.employeeIds.length < l.capacity).length;
    return { assignedLockers, full, total: state.lockerCount, openSpots: totalCapacity - totalFilled, lockersWithSpace };
  }, [state.lockers, state.lockerCount]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return roster
      .filter((e) => e.nameEn?.toLowerCase().includes(q) || e.nameAr?.includes(query.trim()) || e.id.includes(q))
      .map((e) => ({ emp: e, locker: state.lockers.find((l) => l.employeeIds.includes(e.id)) }));
  }, [query, roster, state.lockers]);

  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const pool = unassigned.filter(
      (e) => !q || e.nameEn?.toLowerCase().includes(q) || e.nameAr?.includes(pickerQuery.trim()) || e.id.includes(q)
    );
    return pool.slice(0, 30);
  }, [pickerQuery, unassigned]);

  if (rosterError || syncError) return <SyncErrorScreen error={rosterError || syncError} />;
  if (!rosterLoaded || !loaded) return null;

  function toggleShared(lockerId) {
    setState((s) => ({
      ...s,
      lockers: s.lockers.map((l) => {
        if (l.id !== lockerId) return l;
        const newCap = l.capacity === 1 ? 2 : 1;
        return { ...l, capacity: newCap, employeeIds: l.employeeIds.slice(0, newCap) };
      }),
    }));
  }

  function assign(lockerId, empId) {
    setState((s) => {
      const locker = s.lockers.find((l) => l.id === lockerId);
      if (!locker || locker.employeeIds.includes(empId) || locker.employeeIds.length >= locker.capacity) return s;
      return { ...s, lockers: s.lockers.map((l) => (l.id === lockerId ? { ...l, employeeIds: [...l.employeeIds, empId] } : l)) };
    });
    setPickerFor(null);
    setPickerQuery("");
  }

  function unassign(lockerId, empId) {
    setState((s) => ({
      ...s,
      lockers: s.lockers.map((l) => (l.id === lockerId ? { ...l, employeeIds: l.employeeIds.filter((id) => id !== empId) } : l)),
    }));
  }

  function applyLockerCount() {
    const n = Math.max(1, Math.min(300, parseInt(countInput, 10) || state.lockerCount));
    setState((s) => {
      const current = s.lockers;
      const next = n <= current.length
        ? current.slice(0, n)
        : [...current, ...Array.from({ length: n - current.length }, (_, i) => ({ id: current.length + i + 1, capacity: 1, employeeIds: [] }))];
      return { ...s, lockerCount: n, lockers: next };
    });
    setCountInput(String(n));
    setShowSettings(false);
  }

  function statusOf(l) {
    if (l.employeeIds.length === 0) return "empty";
    if (l.employeeIds.length >= l.capacity) return "full";
    return "partial";
  }

  function printLockerSlip(locker) {
    const rows = locker.employeeIds.map((id) => {
      const e = findById(id);
      return `<div class="rp-row">${escapeHtml(e?.nameEn || "?")} <span style="color:#888">#${escapeHtml(id)}</span></div>`;
    }).join("") || `<div class="rp-row">Unassigned.</div>`;

    document.getElementById("printArea").innerHTML = `
      <div class="rp-brand">MegaLab · Locker Room</div>
      <h1>Locker ${String(locker.id).padStart(2, "0")} Assignment</h1>
      <table>
        <tr><th>Capacity</th><td>${locker.capacity === 2 ? "Shared (2 people)" : "Single (1 person)"}</td></tr>
      </table>
      <h3>Assigned</h3>
      ${rows}
      <div class="rp-footer"><span>Printed ${new Date().toLocaleDateString()}</span><span>MegaLab Locker Room</span></div>
    `;
    window.print();
  }

  function printFullRoster() {
    const rowsHtml = state.lockers.map((l) => {
      const emps = l.employeeIds.map((id) => findById(id)).filter(Boolean);
      const cell = (e) => (e ? `<div class="ename">${escapeHtml(e.nameEn)}</div>${e.nameAr ? `<div class="edetail">${escapeHtml(e.nameAr)}</div>` : ""}` : `<span class="dim">—</span>`);
      const status = statusOf(l);
      const statusColor = { empty: "#3B4A52", partial: "#D98E3B", full: "#C1440E" }[status];
      return `<tr><td class="num">${String(l.id).padStart(2, "0")}</td><td class="num">${l.capacity}</td><td>${cell(emps[0])}</td><td>${cell(emps[1])}</td><td class="num"><span class="status" style="color:${statusColor}">${status}</span></td></tr>`;
    }).join("");

    const unassignedRowsHtml = unassigned.map((e) => `<tr><td>${escapeHtml(e.nameEn)}</td><td>${escapeHtml(e.nameAr || "#" + e.id)}</td></tr>`).join("");

    const summaryStats = [
      ["Total lockers", state.lockerCount],
      ["Lockers in use", stats.assignedLockers],
      ["Lockers full", stats.full],
      ["Open spots", stats.openSpots],
      ["Total employees", roster.length],
      ["Unassigned", unassigned.length],
    ];
    const summaryCellsHtml = summaryStats.map(([label, value]) =>
      `<div class="stat"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`
    ).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Locker Room Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600&display=swap');
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #1E2427; padding: 32px; }
h1 { font-family: 'Oswald', sans-serif; font-size: 24px; color: #2B3A42; margin-bottom: 2px; }
.meta { font-size: 12px; color: #6B7478; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
th, td { border: 1px solid #C7BFB0; padding: 7px 9px; font-size: 11.5px; text-align: left; vertical-align: top; }
th { background: #2B3A42; color: #F5F1EA; font-family: 'Oswald', sans-serif; font-size: 10.5px; letter-spacing: 0.03em; text-transform: uppercase; }
td.num { text-align: center; white-space: nowrap; }
.ename { font-weight: 600; }
.edetail { font-size: 10px; color: #6B7478; margin-top: 1px; }
.dim { color: #B7AF9F; }
.status { font-weight: 700; font-size: 11px; text-transform: uppercase; }
tr:nth-child(even) td { background: #F7F4EE; }
h2 { font-family: 'Oswald', sans-serif; font-size: 14px; color: #2B3A42; margin: 26px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #2B3A42; }
.open-note { font-size: 11px; color: #6B7478; margin: -2px 0 12px; }
.stat-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
.stat { flex: 1 1 140px; background: #F5F1EA; border: 1px solid #DCD5C7; border-radius: 6px; padding: 10px 12px; }
.stat-value { font-family: 'Oswald', sans-serif; font-size: 20px; font-weight: 700; color: #2B3A42; }
.stat-label { font-size: 10px; color: #6B7478; margin-top: 2px; }
.space-banner { margin-top: 10px; background: #2B3A42; color: #F5F1EA; border-radius: 6px; padding: 12px 16px; display: flex; align-items: baseline; gap: 10px; }
.space-banner .n { font-family: 'Oswald', sans-serif; font-size: 26px; font-weight: 700; }
.space-banner .l { font-size: 11.5px; opacity: 0.85; }
@media print { body { padding: 12mm; } }
</style>
</head>
<body>
<h1>Locker Room Report</h1>
<div class="meta">Generated: ${new Date().toLocaleDateString()}</div>

<table>
<thead><tr><th>Locker</th><th>Capacity</th><th>Slot 1</th><th>Slot 2</th><th>Status</th></tr></thead>
<tbody>${rowsHtml}</tbody>
</table>

<h2>Unassigned (${unassigned.length})</h2>
${unassigned.length > 0
  ? `<table><thead><tr><th>Name</th><th>ID</th></tr></thead><tbody>${unassignedRowsHtml}</tbody></table>`
  : `<div class="open-note">Everyone has a locker.</div>`}

<h2>Summary</h2>
<div class="stat-grid">${summaryCellsHtml}</div>
<div class="space-banner"><span class="n">${stats.openSpots}</span><span class="l">open spots remaining</span></div>

</body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  }

  function excludeFromLockerList(empId) {
    setState((s) => ({ ...s, excludedIds: [...new Set([...(s.excludedIds || []), empId])] }));
  }

  function includeInLockerList(empId) {
    setState((s) => ({ ...s, excludedIds: (s.excludedIds || []).filter((id) => id !== empId) }));
  }

  return (
    <div className="lr">
      <div className="lr-toolbar">
        <div className="lr-search">
          <input placeholder="Search by name or ID" value={query} onChange={(e) => setQuery(e.target.value)} />
          {searchResults.length > 0 && (
            <div className="lr-searchResults">
              {searchResults.map(({ emp, locker }) => (
                <div key={emp.id} onClick={() => { if (locker) setActiveLockerId(locker.id); setQuery(""); }}>
                  <span>{emp.nameEn}</span>
                  <span className="lr-muted">{locker ? `#${String(locker.id).padStart(2, "0")}` : "unassigned"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lr-stats">
          {stats.assignedLockers}/{stats.total} in use · {stats.full} full · {stats.openSpots} open spots
        </div>
        <button className="lr-btnLight" onClick={() => { setShowSettings(true); setCountInput(String(state.lockerCount)); }}>
          {state.lockerCount} lockers
        </button>
        <button className="lr-btnLight" onClick={printFullRoster}>Print full roster</button>
      </div>

      {showSettings && (
        <div className="lr-settings">
          <label>Number of lockers</label>
          <input type="number" min="1" max="300" value={countInput} onChange={(e) => setCountInput(e.target.value)} />
          <button className="lr-btnDark" onClick={applyLockerCount}>Apply</button>
          <button className="lr-btnLight" onClick={() => setShowSettings(false)}>Cancel</button>
        </div>
      )}

      <div className="lr-main">
        <div className="lr-grid">
          {state.lockers.map((locker) => {
            const status = statusOf(locker);
            return (
              <div
                key={locker.id}
                className="lr-door"
                style={{ background: DOOR_COLOR[status] }}
                onClick={() => setActiveLockerId(locker.id)}
              >
                <div className="lr-doorTop">
                  <span>{String(locker.id).padStart(2, "0")}</span>
                </div>
                <div className="lr-doorNames">
                  {locker.employeeIds.length === 0 ? (
                    <span className="lr-doorOpen">open</span>
                  ) : (
                    locker.employeeIds.map((id) => <div key={id}>{findById(id)?.nameEn || "?"}</div>)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lr-pool">
          <h4>Unassigned ({unassigned.length})</h4>
          <div className="lr-poolList">
            {unassigned.length === 0 && <div className="lr-muted">Everyone has a locker.</div>}
            {unassigned.map((e) => (
              <div key={e.id} className="lr-poolRow">
                <span>{e.nameEn}</span>
                <span className="lr-poolRowRight">
                  <span className="lr-idChip">#{e.id}</span>
                  <button className="lr-poolExclude" onClick={() => excludeFromLockerList(e.id)} title="Doesn't need a locker">
                    No locker
                  </button>
                </span>
              </div>
            ))}
          </div>

          {excluded.length > 0 && (
            <div className="lr-excludedSection">
              <h4>Not assigning a locker ({excluded.length})</h4>
              <div className="lr-poolList">
                {excluded.map((e) => (
                  <div key={e.id} className="lr-poolRow lr-poolRowMuted">
                    <span>{e.nameEn}</span>
                    <span className="lr-poolRowRight">
                      <span className="lr-idChip">#{e.id}</span>
                      <button className="lr-poolUndo" onClick={() => includeInLockerList(e.id)} title="Add back to unassigned">
                        Undo
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeLocker && (
        <div className="lr-modalOverlay" onClick={() => setActiveLockerId(null)}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modalHeader">
              <h3>Locker {String(activeLocker.id).padStart(2, "0")}</h3>
              <button onClick={() => setActiveLockerId(null)}>✕</button>
            </div>

            <button className="lr-btnLight" onClick={() => printLockerSlip(activeLocker)} style={{ marginBottom: 10 }}>
              Print slip
            </button>

            <button className="lr-btnLight" onClick={() => toggleShared(activeLocker.id)}>
              {activeLocker.capacity === 2 ? "Shared locker (2 people)" : "Single locker (1 person)"} — click to toggle
            </button>

            <div className="lr-assignedList">
              {activeLocker.employeeIds.length === 0 && <p className="lr-muted">No one assigned yet.</p>}
              {activeLocker.employeeIds.map((id) => {
                const emp = findById(id);
                return (
                  <div key={id} className="lr-assignedRow">
                    <span>{emp?.nameEn || "?"} <span className="lr-muted">{emp?.nameAr}</span></span>
                    <button className="lr-removeBtn" onClick={() => unassign(activeLocker.id, id)}>Remove</button>
                  </div>
                );
              })}
            </div>

            {activeLocker.employeeIds.length < activeLocker.capacity && (
              <div className="lr-picker">
                <input
                  placeholder="Search roster to assign…"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  onFocus={() => setPickerFor(activeLocker.id)}
                />
                {pickerFor === activeLocker.id && (
                  <div className="lr-pickerResults">
                    {pickerResults.length === 0 && <div className="lr-muted" style={{ padding: 8 }}>No matches</div>}
                    {pickerResults.map((e) => (
                      <div key={e.id} onClick={() => assign(activeLocker.id, e.id)}>
                        {e.nameEn} <span className="lr-muted">{e.nameAr}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
