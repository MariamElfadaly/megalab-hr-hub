/**
 * Blocking red error screen shown whenever a Firestore read fails.
 * This is the fix for the Locker Room data-loss incident, made reusable
 * so every section (not just Locker Room) shows this instead of ever
 * silently falling back to an empty state that autosave could then
 * overwrite real data with.
 *
 * Usage in any section:
 *   const { loaded, syncError } = useRoster(); // or a section's own hook
 *   if (syncError) return <SyncErrorScreen error={syncError} />;
 *   if (!loaded) return <LoadingScreen />;
 *   // ...only reachable here once a real, successful read has happened
 */
export default function SyncErrorScreen({ error, onRetry }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--red-tint)",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--red-cap)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          maxWidth: 420,
          padding: 28,
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "var(--red-cap)", margin: "0 0 8px" }}>
          Couldn't reach your data
        </h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 16px" }}>
          Something is wrong with the connection to the database. Nothing
          has been changed or lost — the app will not save anything until
          this is fixed, to keep your data safe.
        </p>
        {error?.message && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)" }}>
            {error.message}
          </p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: "var(--teal)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
