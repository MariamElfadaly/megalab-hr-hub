import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

const RosterContext = createContext(null);

/**
 * Shared employee roster: ID, Name EN, Name AR, Title EN, Title AR.
 * Every section (File Tracker, Label Generator, Locker Room, HR
 * Timeline) reads a person's name/title from HERE, not from its own
 * copy — this is what makes the "one shared file" requirement real.
 *
 * DATA-LOSS RULE (from the Locker Room incident — applies here too):
 * a failed read is tracked as its own state, separate from "loaded
 * successfully." Nothing downstream is allowed to treat "failed" as
 * "empty." Consuming components must check `loaded && !syncError`
 * before doing anything write-related — this context only tells you
 * the read state, it doesn't gate writes for you, because writes
 * happen in each section's own collection, not here.
 */
export function RosterProvider({ children }) {
  const { user } = useAuth();
  const [roster, setRoster] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "roster"),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRoster(list);
        setLoaded(true);
        setSyncError(null);
      },
      (error) => {
        // Explicitly DO NOT clear the roster or mark it loaded on error.
        // A failed read must only ever produce an error state, never
        // a silent fall-through to "empty."
        setSyncError(error);
      }
    );

    return unsubscribe;
  }, [user]);

  function findById(id) {
    return roster.find((e) => e.id === id) ?? null;
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (e) =>
        e.id?.toLowerCase().includes(q) ||
        e.nameEn?.toLowerCase().includes(q) ||
        e.nameAr?.includes(query.trim())
    );
  }

  return (
    <RosterContext.Provider value={{ roster, loaded, syncError, findById, search }}>
      {children}
    </RosterContext.Provider>
  );
}

export function useRoster() {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error("useRoster must be used within RosterProvider");
  return ctx;
}
