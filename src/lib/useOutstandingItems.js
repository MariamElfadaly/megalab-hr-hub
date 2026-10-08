import { useEffect, useMemo, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "../contexts/AuthContext";
import { useRoster } from "../contexts/RosterContext";
import { useFileTrackerData } from "./useFileTrackerData";
import { useLabelsData } from "./useLabelsData";
import { useLockerRoomData } from "./useLockerRoomData";
import { useHrTimelineData } from "./useHrTimelineData";
import { computeStatus } from "./fileTrackerChecklist";
import { deriveStatus, getProbationInfo } from "./employeeStatus";
import { totalDaysBetween } from "./dateUtils";

export const TYPE_META = {
  label: { tag: "Label", className: "rm-tag-label", path: "labels" },
  idBadge: { tag: "ID badge", className: "rm-tag-idbadge", path: "file-tracker" },
  fileTracker: { tag: "File tracker", className: "rm-tag-ft", path: "file-tracker" },
  locker: { tag: "Locker", className: "rm-tag-locker", path: "locker-room" },
  hr: { tag: "HR", className: "rm-tag-hr", path: "hr-timeline" },
};

const REMINDERS_DOC = () => doc(db, "reminders", "state");

/**
 * Same "dismissed/checked persist, item itself is recomputed live" split
 * the original app used: the underlying fact (missing label, overdue
 * probation, etc.) is never stored — only whether a human has dismissed
 * or checked off that specific, stably-keyed item.
 */
export function useOutstandingItems() {
  const { user } = useAuth();
  const { roster, loaded: rosterLoaded, syncError: rosterError } = useRoster();
  const ft = useFileTrackerData();
  const labels = useLabelsData();
  const locker = useLockerRoomData();
  const hr = useHrTimelineData();

  const [remState, setRemState] = useState({ dismissed: {}, checked: {} });
  const [remLoaded, setRemLoaded] = useState(false);
  const [remError, setRemError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      REMINDERS_DOC(),
      (snap) => {
        setRemState(snap.exists() ? { dismissed: {}, checked: {}, ...snap.data() } : { dismissed: {}, checked: {} });
        setRemLoaded(true);
        setRemError(null);
      },
      (err) => setRemError(err)
    );
    return unsub;
  }, [user]);

  const anyError = rosterError || ft.syncError || labels.syncError || locker.syncError || hr.syncError || remError;
  const allLoaded = rosterLoaded && ft.loaded && labels.loaded && locker.loaded && hr.loaded && remLoaded;

  const items = useMemo(() => {
    if (!allLoaded) return [];
    const assignedLockerIds = new Set();
    locker.state.lockers.forEach((l) => l.employeeIds.forEach((id) => assignedLockerIds.add(id)));
    const excludedFromLocker = new Set(locker.state.excludedIds || []);

    const rows = [];
    roster.forEach((emp) => {
      const checks = ft.recordsById[emp.id]?.checks || {};
      const ftStatus = computeStatus(checks);

      if (!checks.c23) rows.push({ id: `${emp.id}-idBadge`, emp, type: "idBadge", desc: "ID badge not issued" });

      if (ftStatus.status !== "complete") {
        const missing = ftStatus.mTotal - ftStatus.mDone;
        if (missing > 0) rows.push({ id: `${emp.id}-fileTracker`, emp, type: "fileTracker", desc: `${missing} required item${missing === 1 ? "" : "s"} missing` });
      }

      if (!labels.recordsById[emp.id]?.qrLink) {
        rows.push({ id: `${emp.id}-label`, emp, type: "label", desc: "No Drive link on file" });
      }

      if (!assignedLockerIds.has(emp.id) && !excludedFromLocker.has(emp.id)) {
        rows.push({ id: `${emp.id}-locker`, emp, type: "locker", desc: "No locker assigned" });
      }

      const rec = hr.recordsById[emp.id];
      if (rec) {
        const status = deriveStatus(rec);

        if (status === "probation") {
          const p = getProbationInfo(rec);
          // Prep window: start getting ID/uniform/payroll ready well
          // before the decision is actually due, not just a last-minute
          // "decide now" flag.
          if (p.daysRemaining <= 14 && p.daysRemaining > 1) {
            rows.push({ id: `${emp.id}-hrPrep`, emp, type: "hr", desc: `Probation ends in ${p.daysRemaining}d — start preparing ID, uniform & payroll` });
          }
          if (p.daysRemaining <= 1) {
            rows.push({ id: `${emp.id}-hrProbation`, emp, type: "hr", desc: p.daysRemaining === 0 ? "Probation ends today — decide now" : "Probation ends tomorrow — decide soon" });
          }
        } else if (status === "action_required") {
          rows.push({ id: `${emp.id}-hrAction`, emp, type: "hr", desc: "Probation decision overdue" });
        }

        // Post-confirmation checklist — only matters once someone's
        // actually been confirmed, same trigger the checklist itself uses.
        if (status === "active") {
          const checklist = rec.checklist || {};
          if (!checklist.idIssued) rows.push({ id: `${emp.id}-hrChecklistId`, emp, type: "hr", desc: "Employee ID not issued" });
          if (!checklist.uniformProvided) rows.push({ id: `${emp.id}-hrChecklistUniform`, emp, type: "hr", desc: "Uniform not provided" });
          if (!checklist.lockerAssigned) rows.push({ id: `${emp.id}-hrChecklistLocker`, emp, type: "hr", desc: "Locker not assigned (checklist)" });
          if (!checklist.payrollIssued) rows.push({ id: `${emp.id}-hrChecklistPayroll`, emp, type: "hr", desc: "Payroll account not issued" });
          if (!checklist.empFileComplete) rows.push({ id: `${emp.id}-hrChecklistEmpFile`, emp, type: "hr", desc: "EMP FILE incomplete" });
        }

        // Custom milestones — surfaced once within their own configured
        // reminder window, not on a single fixed threshold.
        (rec.milestones || []).forEach((m) => {
          const daysAway = totalDaysBetween(new Date(), m.date);
          const offsets = m.reminderOffsets || [30, 14, 7, 1, 0];
          const withinWindow = daysAway >= 0 && daysAway <= Math.max(...offsets);
          const recentlyOverdue = daysAway < 0 && daysAway >= -3;
          if (withinWindow || recentlyOverdue) {
            const label = m.type === "other" ? m.customLabel : m.type.replace(/_/g, " ");
            const desc = daysAway === 0 ? `${label} — today` : daysAway > 0 ? `${label} in ${daysAway}d` : `${label} was ${-daysAway}d ago`;
            rows.push({ id: `${emp.id}-hrMilestone-${m.id}`, emp, type: "hr", desc });
          }
        });
      }
    });

    return rows.map((r) => ({ ...r, dismissed: !!remState.dismissed[r.id], checked: !!remState.checked[r.id] }));
  }, [allLoaded, roster, ft.recordsById, labels.recordsById, locker.state, hr.recordsById, remState]);

  const visibleItems = items.filter((r) => !r.dismissed);
  const activeCount = visibleItems.filter((r) => !r.checked).length;

  // Dotted field paths, not a nested object — merge:true (and updateDoc)
  // only replace the WHOLE nested map if you pass it as an object, which
  // would silently wipe every other employee's dismissed/checked state.
  // A dotted key updates just that one entry instead.
  const dismiss = useCallback(async (id) => {
    try {
      await updateDoc(REMINDERS_DOC(), { [`dismissed.${id}`]: true });
    } catch {
      // doc doesn't exist yet on the very first dismissal ever
      await setDoc(REMINDERS_DOC(), { dismissed: { [id]: true }, checked: {} });
    }
  }, []);

  const toggleChecked = useCallback(async (id, value) => {
    try {
      await updateDoc(REMINDERS_DOC(), { [`checked.${id}`]: value });
    } catch {
      await setDoc(REMINDERS_DOC(), { dismissed: {}, checked: { [id]: value } });
    }
  }, []);

  return { allItems: items, visibleItems, activeCount, loaded: allLoaded, syncError: anyError, dismiss, toggleChecked };
}
