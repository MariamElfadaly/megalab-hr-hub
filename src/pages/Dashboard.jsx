import { useState } from "react";
import { doc, setDoc, deleteDoc, getDocs, collection, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRoster } from "../contexts/RosterContext";
import SyncErrorScreen from "../components/SyncErrorScreen";
import RosterImport from "../components/RosterImport";

// Collections that store data per-employee, keyed by the same roster ID.
// Locker Room isn't included here — it stores assignments inside one
// shared document rather than one doc per employee, so "delete
// everywhere" can't reach it yet; that gets added once Locker Room's
// real logic is ported in.
const PER_EMPLOYEE_COLLECTIONS = ["roster", "fileTracker", "labels", "hrTimeline"];

export default function Dashboard() {
  const { roster, loaded, syncError } = useRoster();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showDanger, setShowDanger] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  if (syncError) return <SyncErrorScreen error={syncError} />;
  if (!loaded) return null;

  function startEdit(emp) {
    setEditingId(emp.id);
    setDraft({ nameEn: emp.nameEn || "", nameAr: emp.nameAr || "", titleEn: emp.titleEn || "", titleAr: emp.titleAr || "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(id) {
    setBusyId(id);
    try {
      await setDoc(doc(db, "roster", id), draft);
      cancelEdit();
    } catch (err) {
      alert("Couldn't save: " + err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Removes ONLY the roster entry. Their history in other sections stays.
  async function removeFromRosterOnly(emp) {
    const label = emp.nameEn || emp.nameAr || emp.id;
    if (!confirm(`Remove ${label} (#${emp.id}) from the roster only? Their File Tracker, Label, and HR Timeline records stay untouched.`)) return;
    setBusyId(emp.id);
    try {
      await deleteDoc(doc(db, "roster", emp.id));
    } catch (err) {
      alert("Couldn't remove: " + err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Removes this employee's ID from every section — the real fix for a
  // genuine duplicate (a person who should never have existed under
  // this ID at all).
  async function deleteEverywhere(emp) {
    const label = emp.nameEn || emp.nameAr || emp.id;
    if (!confirm(`Permanently delete #${emp.id} (${label}) from EVERY section — roster, File Tracker, Labels, and HR Timeline? This cannot be undone. Only do this for a genuine duplicate, not a real employee.`)) return;
    setBusyId(emp.id);
    try {
      await Promise.all(PER_EMPLOYEE_COLLECTIONS.map((c) => deleteDoc(doc(db, c, emp.id))));
    } catch (err) {
      alert("Couldn't fully delete: " + err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Wipes the entire roster collection. Gated behind typing an exact
  // phrase — a single click is too easy to fire by accident for
  // something this destructive.
  async function clearEntireRoster() {
    setClearing(true);
    try {
      const snap = await getDocs(collection(db, "roster"));
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      setConfirmText("");
      setShowDanger(false);
    } catch (err) {
      alert("Couldn't clear the roster: " + err.message);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div>
      <div
        style={{
          borderBottom: "2px solid var(--ink)",
          paddingBottom: 10,
          marginBottom: 18,
        }}
      >
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--teal-dark)", margin: "0 0 3px" }}>
          Roster overview
        </p>
        <h2 style={{ margin: 0, fontSize: 19 }}>{roster.length} employees</h2>
      </div>

      <RosterImport />

      {roster.length > 0 && (
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {roster.map((emp) => {
            const isEditing = editingId === emp.id;
            const isBusy = busyId === emp.id;

            return (
              <div
                key={emp.id}
                style={{
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 13,
                }}
              >
                {isEditing ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)" }}>{emp.id}</span>
                    <input value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} placeholder="Name EN" style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 140 }} />
                    <input value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} placeholder="Name AR" style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 140 }} />
                    <input value={draft.titleEn} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })} placeholder="Title EN" style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 110 }} />
                    <input value={draft.titleAr} onChange={(e) => setDraft({ ...draft, titleAr: e.target.value })} placeholder="Title AR" style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 110 }} />
                    <button onClick={() => saveEdit(emp.id)} disabled={isBusy} style={{ background: "var(--teal)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 12, fontWeight: 600 }}>
                      {isBusy ? "Saving…" : "Save"}
                    </button>
                    <button onClick={cancelEdit} style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 12 }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px" }}>
                      {emp.id}
                    </span>
                    <span style={{ fontWeight: 600 }}>{emp.nameEn}</span>
                    <span style={{ color: "var(--ink-soft)" }}>{emp.nameAr}</span>
                    {emp.titleEn && <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{emp.titleEn}</span>}
                    <span style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(emp)} style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", padding: "4px 9px", fontSize: 11.5, fontWeight: 600 }}>
                        Edit
                      </button>
                      <button onClick={() => removeFromRosterOnly(emp)} disabled={isBusy} style={{ background: "var(--amber-tint)", color: "var(--amber-cap)", border: "1px solid var(--amber-cap)", borderRadius: "var(--radius-sm)", padding: "4px 9px", fontSize: 11.5, fontWeight: 600 }}>
                        {isBusy ? "…" : "Remove"}
                      </button>
                      <button onClick={() => deleteEverywhere(emp)} disabled={isBusy} style={{ background: "var(--red-tint)", color: "var(--red-cap)", border: "1px solid var(--red-cap)", borderRadius: "var(--radius-sm)", padding: "4px 9px", fontSize: 11.5, fontWeight: 600 }}>
                        {isBusy ? "…" : "Delete everywhere"}
                      </button>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <button
          onClick={() => setShowDanger(!showDanger)}
          style={{ background: "none", border: "none", color: "var(--red-cap)", fontSize: 12, fontWeight: 600, padding: 0 }}
        >
          {showDanger ? "Hide" : "Show"} danger zone
        </button>

        {showDanger && (
          <div style={{ marginTop: 10, background: "var(--red-tint)", border: "1px solid var(--red-cap)", borderRadius: "var(--radius)", padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--ink)" }}>
              This permanently deletes all {roster.length} roster entries. It does NOT touch File Tracker, Label, or HR Timeline data in other sections — only this roster list. Type <strong>CLEAR ROSTER</strong> exactly to enable the button.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CLEAR ROSTER"
                style={{ padding: "6px 10px", border: "1px solid var(--red-cap)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
              />
              <button
                onClick={clearEntireRoster}
                disabled={confirmText !== "CLEAR ROSTER" || clearing}
                style={{
                  background: confirmText === "CLEAR ROSTER" ? "var(--red-cap)" : "var(--line-strong)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: confirmText === "CLEAR ROSTER" ? "pointer" : "not-allowed",
                }}
              >
                {clearing ? "Clearing…" : `Clear all ${roster.length} entries`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
