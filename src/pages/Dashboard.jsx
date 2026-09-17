import { useState } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRoster } from "../contexts/RosterContext";
import SyncErrorScreen from "../components/SyncErrorScreen";
import RosterImport from "../components/RosterImport";

export default function Dashboard() {
  const { roster, loaded, syncError } = useRoster();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busyId, setBusyId] = useState(null);

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

  async function removeEmployee(emp) {
    const label = emp.nameEn || emp.nameAr || emp.id;
    if (!confirm(`Remove ${label} (#${emp.id}) from the roster? This does not delete their File Tracker, Label, Locker, or HR Timeline records in other sections — only the roster entry.`)) {
      return;
    }
    setBusyId(emp.id);
    try {
      await deleteDoc(doc(db, "roster", emp.id));
    } catch (err) {
      alert("Couldn't remove: " + err.message);
    } finally {
      setBusyId(null);
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
                    <input
                      value={draft.nameEn}
                      onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
                      placeholder="Name EN"
                      style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 140 }}
                    />
                    <input
                      value={draft.nameAr}
                      onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                      placeholder="Name AR"
                      style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 140 }}
                    />
                    <input
                      value={draft.titleEn}
                      onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })}
                      placeholder="Title EN"
                      style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 110 }}
                    />
                    <input
                      value={draft.titleAr}
                      onChange={(e) => setDraft({ ...draft, titleAr: e.target.value })}
                      placeholder="Title AR"
                      style={{ padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, width: 110 }}
                    />
                    <button
                      onClick={() => saveEdit(emp.id)}
                      disabled={isBusy}
                      style={{ background: "var(--teal)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 12, fontWeight: 600 }}
                    >
                      {isBusy ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", padding: "5px 10px", fontSize: 12 }}
                    >
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
                      <button
                        onClick={() => startEdit(emp)}
                        style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", padding: "4px 9px", fontSize: 11.5, fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeEmployee(emp)}
                        disabled={isBusy}
                        style={{ background: "var(--red-tint)", color: "var(--red-cap)", border: "1px solid var(--red-cap)", borderRadius: "var(--radius-sm)", padding: "4px 9px", fontSize: 11.5, fontWeight: 600 }}
                      >
                        {isBusy ? "…" : "Remove"}
                      </button>
                    </span>
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
