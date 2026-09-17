import { useEffect, useState, useCallback } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

/**
 * Checklist state for every employee, keyed by the shared roster's
 * employee ID — /fileTracker/{employeeId}. This is separate from the
 * roster itself: the roster holds who someone is, this holds their
 * onboarding paperwork state, same split as the merge architecture.
 *
 * Same data-loss rule as RosterContext: a failed read is tracked
 * separately from "loaded", and nothing here falls back to empty.
 */
export function useFileTrackerData() {
  const { user } = useAuth();
  const [recordsById, setRecordsById] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "fileTracker"),
      (snapshot) => {
        const map = {};
        snapshot.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setRecordsById(map);
        setLoaded(true);
        setSyncError(null);
      },
      (error) => {
        setSyncError(error);
      }
    );

    return unsubscribe;
  }, [user]);

  // Only ever called after a confirmed successful read — components
  // using this hook must check loaded && !syncError first, same rule
  // as everywhere else in this app.
  const toggleCheck = useCallback((employeeId, key, checked) => {
    const existing = recordsById[employeeId]?.checks ?? {};
    const checks = { ...existing, [key]: checked };
    return setDoc(doc(db, "fileTracker", employeeId), { checks }, { merge: true });
  }, [recordsById]);

  const updateField = useCallback((employeeId, field, value) => {
    return setDoc(doc(db, "fileTracker", employeeId), { [field]: value }, { merge: true });
  }, []);

  return { recordsById, loaded, syncError, toggleCheck, updateField };
}
