import { collection, doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { calcProbationEnd } from "./dateUtils";

// Adapted from hr-timeline-tracker/src/lib/employees.js. Two real
// changes from the original:
//  1. Doc ID is the shared roster's employee ID, not an auto-generated
//     one — this is what makes cross-navigation and the shared roster
//     work. Collection is /hrTimeline, not a per-user subcollection,
//     since the whole team shares one login already.
//  2. name/employeeId fields are dropped — identity comes from the
//     roster now. Everything else (jobTitle, joiningDate, phone,
//     department, email, manager, probation, milestones, notes) is
//     unchanged from the original.

function hrDoc(employeeId) {
  return doc(db, "hrTimeline", employeeId);
}

export function subscribeToHrTimeline(onChange, onError) {
  return onSnapshot(
    collection(db, "hrTimeline"),
    (snapshot) => {
      const map = {};
      snapshot.docs.forEach((d) => { map[d.id] = d.data(); });
      onChange(map);
    },
    onError
  );
}

/**
 * input: { jobTitle, joiningDate (ISO), phoneNumber, probationType,
 *          probationCustomEndDate, department, email, manager }
 */
export async function createHrRecord(employeeId, input) {
  const probationEnd = calcProbationEnd(input.joiningDate, {
    type: input.probationType,
    customEndDate: input.probationCustomEndDate,
  });

  const record = {
    jobTitle: input.jobTitle?.trim() || "",
    joiningDate: input.joiningDate,
    phoneNumber: input.phoneNumber?.trim() || "",
    department: input.department?.trim() || null,
    email: input.email?.trim() || null,
    manager: input.manager?.trim() || null,

    status: "probation",
    probation: {
      type: input.probationType,
      startDate: input.joiningDate,
      endDate: probationEnd.toISOString().slice(0, 10),
      decision: null,
    },

    confirmation: null,
    milestones: [],
    notesLog: [],
  };

  await setDoc(hrDoc(employeeId), record);
}

export async function updateHrRecord(employeeId, patch) {
  await updateDoc(hrDoc(employeeId), patch);
}

export async function getHrRecord(employeeId) {
  const snap = await getDoc(hrDoc(employeeId));
  return snap.exists() ? snap.data() : null;
}

export async function confirmEmployee(employeeId, confirmDate) {
  await updateHrRecord(employeeId, {
    status: "active",
    "probation.decision": { type: "confirmed", date: confirmDate },
    confirmation: { confirmedDate: confirmDate },
  });
}

export async function extendProbation(employeeId, newEndDateISO, note, todayDate) {
  const rec = await getHrRecord(employeeId);
  const history = rec?.probation?.history || [];
  await updateHrRecord(employeeId, {
    status: "probation",
    "probation.endDate": newEndDateISO,
    "probation.decision": null,
    "probation.history": [
      ...history,
      { type: "extended", date: todayDate, newEndDate: newEndDateISO, note: note || null },
    ],
  });
}

export async function endEmployment(employeeId, endDate, reason) {
  await updateHrRecord(employeeId, {
    status: "ended",
    "probation.decision": { type: "ended", date: endDate, reason: reason || null },
  });
}

export async function scheduleReview(employeeId, reviewDateISO, note, todayDate) {
  await updateHrRecord(employeeId, {
    status: "action_required",
    "probation.decision": { type: "review_scheduled", date: todayDate, reviewDate: reviewDateISO, note: note || null },
  });
}

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function addMilestone(employeeId, input) {
  const rec = await getHrRecord(employeeId);
  const milestones = rec?.milestones || [];
  const milestone = {
    id: makeId(),
    type: input.type,
    customLabel: input.type === "other" ? input.customLabel?.trim() || "" : "",
    date: input.date,
    note: input.note?.trim() || null,
    createdAt: new Date().toISOString(),
  };
  await updateHrRecord(employeeId, { milestones: [...milestones, milestone] });
}

export async function deleteMilestone(employeeId, milestoneId) {
  const rec = await getHrRecord(employeeId);
  const milestones = (rec?.milestones || []).filter((m) => m.id !== milestoneId);
  await updateHrRecord(employeeId, { milestones });
}

export async function addNoteEntry(employeeId, text) {
  const rec = await getHrRecord(employeeId);
  const notesLog = rec?.notesLog || [];
  const entry = { id: makeId(), text: text.trim(), timestamp: new Date().toISOString() };
  await updateHrRecord(employeeId, { notesLog: [entry, ...notesLog] });
}

export async function deleteNoteEntry(employeeId, noteId) {
  const rec = await getHrRecord(employeeId);
  const notesLog = (rec?.notesLog || []).filter((n) => n.id !== noteId);
  await updateHrRecord(employeeId, { notesLog });
}
