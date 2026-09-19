import { useEffect, useState } from "react";
import { subscribeToHrTimeline } from "./hrTimelineData";
import { useAuth } from "../contexts/AuthContext";

export function useHrTimelineData() {
  const { user } = useAuth();
  const [recordsById, setRecordsById] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToHrTimeline(
      (map) => {
        setRecordsById(map);
        setLoaded(true);
        setSyncError(null);
      },
      (error) => setSyncError(error)
    );
    return unsub;
  }, [user]);

  return { recordsById, loaded, syncError };
}
