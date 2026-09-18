import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_COUNT = 30;

const emptyState = (count) => ({
  lockerCount: count,
  lockers: Array.from({ length: count }, (_, i) => ({ id: i + 1, capacity: 1, employeeIds: [] })),
  excludedIds: [], // employees marked "doesn't need a locker" — Locker Room only, doesn't touch the roster
});

/**
 * Locker Room's shared single-document workspace — /lockerRoom/shared.
 * Ported from the original locker-room app almost line-for-line on the
 * sync mechanics, since that's exactly the code that was fixed after
 * the real data-loss incident. The one change: lockers now hold real
 * roster employee IDs in employeeIds, not a locally-typed name/badge/
 * department/phone record — identity comes from the shared roster.
 */
export function useLockerRoomData() {
  const { user } = useAuth();
  const [state, setState] = useState(emptyState(DEFAULT_COUNT));
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const saveTimer = useRef(null);
  const lastSavedJson = useRef(null);
  const docRef = useMemo(() => doc(db, "lockerRoom", "shared"), []);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const json = JSON.stringify(data);
          if (data.lockers && data.lockerCount && json !== lastSavedJson.current) {
            setState(data);
          }
        }
        setSyncError(false);
        setLoaded(true);
      },
      (err) => {
        // CRITICAL: do NOT setLoaded(true) here. Doing so would let the
        // save effect below fire and silently overwrite real Firestore
        // data with whatever local default/blank state this tab holds.
        console.error("Locker Room sync error", err);
        setSyncError(true);
      }
    );
    return unsub;
  }, [docRef, user]);

  useEffect(() => {
    if (!loaded || syncError) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const json = JSON.stringify(state);
        lastSavedJson.current = json;
        await setDoc(docRef, state);
      } catch (e) {
        console.error("Locker Room save failed", e);
        setSyncError(true);
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [state, loaded, syncError, docRef]);

  return { state, setState, loaded, syncError };
}
