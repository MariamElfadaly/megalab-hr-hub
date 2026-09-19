// Pure date math. No storage of computed values — everything here is
// derived fresh from a stored date each time it's called.
// Copied verbatim from hr-timeline-tracker/src/lib/dateUtils.js.

export function toDate(value) {
  if (value instanceof Date) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function calendarDiff(startInput, endInput = new Date()) {
  const start = toDate(startInput);
  const end = toDate(endInput);

  if (start > end) {
    const flipped = calendarDiff(end, start);
    return { years: flipped.years, months: flipped.months, days: flipped.days, negative: true };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days, negative: false };
}

export function totalDaysBetween(startInput, endInput = new Date()) {
  const start = toDate(startInput);
  const end = toDate(endInput);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((stripTime(end) - stripTime(start)) / MS_PER_DAY);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function addMonths(dateInput, months) {
  const date = toDate(dateInput);
  const result = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return result;
}

export function calcProbationEnd(startDateISO, duration) {
  if (duration.type === "custom") {
    return toDate(duration.customEndDate);
  }
  const monthsByType = { "1_month": 1, "3_months": 3, "6_months": 6 };
  const months = monthsByType[duration.type] ?? 3;
  return addMonths(startDateISO, months);
}

export function probationProgress(startDateISO, endDate, now = new Date()) {
  const totalDays = totalDaysBetween(startDateISO, endDate);
  const daysCompleted = Math.max(0, Math.min(totalDays, totalDaysBetween(startDateISO, now)));
  const daysRemaining = Math.max(0, totalDaysBetween(now, endDate));
  const percent = totalDays > 0 ? Math.min(100, Math.round((daysCompleted / totalDays) * 100)) : 100;
  const isOver = totalDaysBetween(now, endDate) <= 0;
  return { totalDays, daysCompleted, daysRemaining, percent, isOver };
}
