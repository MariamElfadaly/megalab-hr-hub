import { useRoster } from "../contexts/RosterContext";
import SyncErrorScreen from "../components/SyncErrorScreen";
import RosterImport from "../components/RosterImport";

export default function Dashboard() {
  const { roster, loaded, syncError } = useRoster();

  if (syncError) return <SyncErrorScreen error={syncError} />;
  if (!loaded) return null;

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
          {roster.map((emp) => (
            <div
              key={emp.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "8px 14px",
                borderBottom: "1px solid var(--line)",
                fontSize: 13,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px" }}>
                {emp.id}
              </span>
              <span style={{ fontWeight: 600 }}>{emp.nameEn}</span>
              <span style={{ color: "var(--ink-soft)" }}>{emp.nameAr}</span>
              {emp.titleEn && <span style={{ marginInlineStart: "auto", fontSize: 11, color: "var(--ink-soft)" }}>{emp.titleEn}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
