import { probationProgress, upcomingAnniversaries } from "./dateUtils";

/**
 * Ported from hr-timeline-tracker/src/lib/employeeStatus.js.
 * Status is DERIVED, not just read from the stored field, because a
 * probation end date can pass at any moment without anyone touching the
 * record. A "review_scheduled" decision does NOT close out probation —
 * the employee stays in "action_required" until a real decision is made.
 * (The original's onboarding-checklist branches are dropped: File
 * Tracker owns onboarding in the merged app.)
 */
export function deriveStatus(employee) {
  if (employee.status === "ended") return "ended";

  const decision = employee.probation?.decision;

  if (decision?.type === "confirmed") return "active";
  if (decision?.type === "ended") return "ended";

  if (employee.probation && (!decision || decision.type === "review_scheduled")) {
    const progress = probationProgress(employee.probation.startDate, employee.probation.endDate);
    return progress.isOver ? "action_required" : "probation";
  }

  return employee.status || "active";
}

export function getProbationInfo(employee) {
  if (!employee.probation) return null;
  return probationProgress(employee.probation.startDate, employee.probation.endDate);
}

/** A single most-relevant upcoming item to surface on the list card. */
export function getNextAction(employee, t) {
  const status = deriveStatus(employee);

  if (status === "action_required") {
    const decision = employee.probation?.decision;
    if (decision?.type === "review_scheduled") {
      return { text: t("statusReviewScheduled"), urgent: true };
    }
    return { text: t("statusActionRequired"), urgent: true };
  }

  if (status === "probation") {
    const p = getProbationInfo(employee);
    if (p.daysRemaining <= 7) {
      return { text: t("decideSoonShort", { days: p.daysRemaining }), urgent: true };
    }
    return { text: `${p.daysRemaining} ${t("daysRemaining")}`, urgent: false };
  }

  if (status === "active") {
    const anniversaries = upcomingAnniversaries(employee.joiningDate)
      .filter((m) => m.daysAway >= 0)
      .sort((a, b) => a.daysAway - b.daysAway);
    const next = anniversaries[0];
    if (next && next.daysAway <= 30) {
      return { text: `${next.label.replace("_", " ")} · ${next.daysAway}d`, urgent: false };
    }
  }

  return null;
}
