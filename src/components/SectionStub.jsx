/**
 * Placeholder for a section whose real logic hasn't been ported into
 * the merged app yet. Replace each of these with the real page as each
 * system gets migrated in, phase by phase — not all at once, to keep
 * the working systems working while this happens.
 */
export default function SectionStub({ title, note }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px dashed var(--line-strong)",
        borderRadius: "var(--radius)",
        padding: 24,
        color: "var(--ink-soft)",
      }}
    >
      <h2 style={{ margin: "0 0 8px", color: "var(--ink)" }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 13 }}>{note}</p>
    </div>
  );
}
