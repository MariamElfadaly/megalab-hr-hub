import { useRoster } from "../contexts/RosterContext";
import { useLanguage } from "../contexts/LanguageContext";
import SyncErrorScreen from "../components/SyncErrorScreen";

export default function Dashboard() {
  const { roster, loaded, syncError } = useRoster();
  const { t } = useLanguage();

  if (syncError) return <SyncErrorScreen error={syncError} />;
  if (!loaded) return null; // simple loading state; swap for a spinner later

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

      <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
        Use the search bar above to find someone by name or ID, or pick a
        section from the sidebar. This landing page is a placeholder for
        the real overview (progress bars, recent activity) — File
        Tracker's own overview panel gets ported in here in a later
        phase.
      </p>
    </div>
  );
}
