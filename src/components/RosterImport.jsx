import { useState } from "react";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

/**
 * Paste-in bulk import for the shared roster. Accepts tab- or
 * comma-separated rows: ID, Name EN, Name AR, Title EN, Title AR
 * (header row optional, auto-detected and skipped).
 *
 * This is the same shape as the CSV already used for the Drive-folder
 * script and Label Generator's bulk import, so existing data can be
 * pasted straight in with no reformatting.
 */
export default function RosterImport({ onDone }) {
  const { user } = useAuth();
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function parse() {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = lines.map((line) => line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim()));

    // Drop a header row if the first cell looks like "ID" rather than a real ID
    const looksLikeHeader = rows[0]?.[0]?.toLowerCase() === "id";
    const dataRows = looksLikeHeader ? rows.slice(1) : rows;

    const parsed = dataRows
      .filter((r) => r[0])
      .map((r) => ({
        id: r[0],
        nameEn: r[1] || "",
        nameAr: r[2] || "",
        titleEn: r[3] || "",
        titleAr: r[4] || "",
      }));
    setPreview(parsed);
  }

  async function runImport() {
    if (!preview.length || !user) return;
    setBusy(true);
    setStatus("Importing…");
    try {
      // Firestore batches cap at 500 writes; chunk just in case the
      // roster grows well past that in the future.
      for (let i = 0; i < preview.length; i += 450) {
        const batch = writeBatch(db);
        preview.slice(i, i + 450).forEach((emp) => {
          batch.set(doc(db, "roster", emp.id), {
            nameEn: emp.nameEn,
            nameAr: emp.nameAr,
            titleEn: emp.titleEn,
            titleAr: emp.titleAr,
          });
        });
        await batch.commit();
      }
      setStatus(`Imported ${preview.length} employee(s).`);
      setRaw("");
      setPreview([]);
      onDone?.();
    } catch (err) {
      setStatus("Import failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Import roster</h3>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ink-soft)" }}>
        Paste rows in this order: ID, Name EN, Name AR, Title EN, Title AR — tab or
        comma separated, one employee per line. A header row is fine, it's detected automatically.
        Importing an ID that already exists overwrites that employee's roster entry.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"ID\tName EN\tName AR\tTitle EN\tTitle AR\n181\tMahmoud Atia\tمحمود احمد عطيه\tLab Chemist\tكميائى معمل"}
        rows={6}
        style={{
          width: "100%",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          padding: 8,
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-sm)",
          marginBottom: 8,
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={parse}
          style={{ background: "var(--panel)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", padding: "7px 12px", fontSize: 12, fontWeight: 600 }}
        >
          Preview
        </button>
        {preview.length > 0 && (
          <button
            onClick={runImport}
            disabled={busy}
            style={{ background: "var(--teal)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "7px 12px", fontSize: 12, fontWeight: 600 }}
          >
            {busy ? "Importing…" : `Import ${preview.length} employee(s)`}
          </button>
        )}
        {status && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{status}</span>}
      </div>

      {preview.length > 0 && (
        <div style={{ marginTop: 10, maxHeight: 160, overflowY: "auto", fontSize: 11.5, fontFamily: "var(--font-mono)" }}>
          {preview.slice(0, 10).map((r) => (
            <div key={r.id}>
              {r.id} — {r.nameEn} / {r.nameAr} {r.titleEn && `(${r.titleEn})`}
            </div>
          ))}
          {preview.length > 10 && <div>…and {preview.length - 10} more</div>}
        </div>
      )}
    </div>
  );
}
