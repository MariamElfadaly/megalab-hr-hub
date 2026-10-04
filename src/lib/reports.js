import { deriveStatus, getProbationInfo } from "./employeeStatus";
import { totalDaysBetween } from "./dateUtils";

/**
 * Ported from hr-timeline-tracker/src/lib/reports.js. The checklist
 * completion rate / incomplete-checklists section from the original is
 * dropped — there's no checklist field on HR Timeline records in the
 * merged app, since File Tracker owns onboarding tracking now.
 *
 * `employees` here is an array of { ...roster fields, ...hr record }
 * merged objects — built by the caller from roster + hrTimeline data.
 */
export function buildReportData(employees) {
  const counts = { active: 0, probation: 0, action_required: 0, ended: 0 };
  const endingSoon = [];
  const upcomingMilestones = [];
  const byDepartment = new Map();

  let tenureDaysSum = 0;
  let tenureCount = 0;
  let confirmedCount = 0;
  let endedDuringProbationCount = 0;

  for (const emp of employees) {
    const status = deriveStatus(emp);
    counts[status] = (counts[status] || 0) + 1;

    if (status === "probation" || status === "active" || status === "action_required") {
      tenureDaysSum += totalDaysBetween(emp.joiningDate, new Date());
      tenureCount += 1;
    }

    if (status !== "ended") {
      const dept = emp.department?.trim() || "—";
      byDepartment.set(dept, (byDepartment.get(dept) || 0) + 1);
    }

    if (emp.confirmation?.confirmedDate) {
      confirmedCount += 1;
    } else if (status === "ended") {
      endedDuringProbationCount += 1;
    }

    if (status === "probation") {
      const p = getProbationInfo(emp);
      if (p.daysRemaining <= 30) {
        endingSoon.push({ id: emp.id, name: emp.nameEn, daysRemaining: p.daysRemaining });
      }
    }

    for (const m of emp.milestones || []) {
      const daysAway = totalDaysBetween(new Date(), m.date);
      if (daysAway >= 0 && daysAway <= 30) {
        upcomingMilestones.push({
          id: emp.id, name: emp.nameEn,
          milestoneType: m.type, customLabel: m.customLabel,
          date: m.date, daysAway,
        });
      }
    }
  }

  endingSoon.sort((a, b) => a.daysRemaining - b.daysRemaining);
  upcomingMilestones.sort((a, b) => a.daysAway - b.daysAway);

  const departmentBreakdown = [...byDepartment.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const avgTenureDays = tenureCount > 0 ? tenureDaysSum / tenureCount : 0;
  const avgTenure = avgTenureDays > 0 ? daysToYearsMonths(avgTenureDays) : null;

  const probationDecided = confirmedCount + endedDuringProbationCount;
  const probationPassRate = probationDecided > 0 ? Math.round((confirmedCount / probationDecided) * 100) : null;

  return {
    total: employees.length,
    counts,
    departmentBreakdown,
    avgTenure,
    probationPassRate,
    probationDecided,
    endingSoon,
    upcomingMilestones,
  };
}

function daysToYearsMonths(days) {
  const years = Math.floor(days / 365);
  const months = Math.round(((days % 365) / 365) * 12);
  return { years, months };
}
