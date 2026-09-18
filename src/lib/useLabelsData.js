import { useEffect, useState, useCallback } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

/**
 * Label records, keyed by the shared roster's employee ID —
 * /labels/{employeeId}. Deliberately minimal: name/title come from the
 * shared roster now, not from here — this collection only holds what's
 * genuinely label-specific, which today is just the Drive folder link
 * that becomes the QR code's content.
 *
 * Same data-loss rule as everywhere else: a failed read blocks writes,
 * never falls back to empty.
 */
export function useLabelsData() {
  const { user } = useAuth();
  const [recordsById, setRecordsById] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "labels"),
      (snapshot) => {
        const map = {};
        snapshot.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setRecordsById(map);
        setLoaded(true);
        setSyncError(null);
      },
      (error) => setSyncError(error)
    );

    return unsubscribe;
  }, [user]);

  const setQrLink = useCallback((employeeId, qrLink) => {
    return setDoc(doc(db, "labels", employeeId), { qrLink }, { merge: true });
  }, []);

  return { recordsById, loaded, syncError, setQrLink };
}
