import { useMemo, useState } from "react";
import { useRoster } from "../contexts/RosterContext";
import { useLockerRoomData } from "../lib/useLockerRoomData";
import SyncErrorScreen from "../components/SyncErrorScreen";
import "./LockerRoom.css";

const DOOR_COLOR = { empty: "#3B4A52", partial: "#D98E3B", full: "#C1440E" };

export default function LockerRoom() {
  const { roster, loaded: rosterLoaded, syncError: rosterError, findById } = useRoster();
  const { state, setState, loaded, syncError } = useLockerRoomData();

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

  const unassigned = useMemo(() => roster.filter((e) => !assignedIds.has(e.id)), [roster, assignedIds]);

  const activeLocker = state.lockers.find((l) => l.id === activeLockerId) || null;

  const stats = useMemo(() => {
    const assignedLockers = state.lockers.filter((l) => l.employeeIds.length > 0).length;
    const full = state.lockers.filter((l) => l.employeeIds.length >= l.capacity).length;
    const totalCapacity = state.lockers.reduce((sum, l) => sum + l.capacity, 0);
    const totalFilled = state.lockers.reduce((sum, l) => sum + l.employeeIds.length, 0);
    return { assignedLockers, full, total: state.lockerCount, openSpots: totalCapacity - totalFilled };
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
                <span className="lr-idChip">#{e.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeLocker && (
        <div className="lr-modalOverlay" onClick={() => setActiveLockerId(null)}>
          <div className="lr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lr-modalHeader">
              <h3>Locker {String(activeLocker.id).padStart(2, "0")}</h3>
              <button onClick={() => setActiveLockerId(null)}>✕</button>
            </div>

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
