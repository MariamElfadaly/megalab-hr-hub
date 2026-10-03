import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOutstandingItems } from "../lib/useOutstandingItems";

/**
 * Plays a short two-tone chime using the Web Audio API directly — no
 * audio file to host or fail to load. Only fires when the count goes
 * UP from what it was a moment ago, not on every render or page visit,
 * so it doesn't nag every time you navigate around the app.
 */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {
    // Web Audio blocked or unsupported — silently skip, the visual badge still updates
  }
}

export default function ReminderBell() {
  const { activeCount, loaded } = useOutstandingItems();
  const navigate = useNavigate();
  const prevCount = useRef(null);

  useEffect(() => {
    if (!loaded) return;
    // First successful load just establishes the baseline — never chimes
    // on initial page load, only on a real increase after that.
    if (prevCount.current !== null && activeCount > prevCount.current) {
      playChime();
    }
    prevCount.current = activeCount;
  }, [activeCount, loaded]);

  return (
    <button className="shell__bell" onClick={() => navigate("/reminders")} title="Action items" aria-label="Action items">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {loaded && activeCount > 0 && <span className="shell__bellBadge">{activeCount > 99 ? "99+" : activeCount}</span>}
    </button>
  );
}
