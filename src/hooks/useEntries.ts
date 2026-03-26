"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { Entry } from "@/lib/types";

/** Compute lap numbers for all entries based on bib and time order */
function computeLaps(entries: Entry[]): Entry[] {
  const bibLapCount: Record<number, number> = {};
  return entries.map((e) => {
    if (e.bibNumber === null) return { ...e, lap: 0 };
    bibLapCount[e.bibNumber] = (bibLapCount[e.bibNumber] || 0) + 1;
    return { ...e, lap: bibLapCount[e.bibNumber] };
  });
}

/** Get lap counts per bib: { bibNumber: currentLapCount } */
export function getLapCounts(entries: Entry[]): Record<number, number> {
  const counts: Record<number, number> = {};
  entries.forEach((e) => {
    if (e.bibNumber !== null) {
      counts[e.bibNumber] = (counts[e.bibNumber] || 0) + 1;
    }
  });
  return counts;
}

export function useEntries(raceId: string | null, timerId?: string) {
  const [rawEntries, setRawEntries] = useState<Entry[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const connRef = ref(db, ".info/connected");
    const unsub = onValue(connRef, (snap) => {
      setIsOnline(snap.val() === true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!raceId) return;
    const entriesRef = ref(db, `entries/${raceId}`);
    const unsub = onValue(entriesRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setRawEntries([]);
        return;
      }
      const list: Entry[] = Object.entries(data).map(([key, val]) => ({
        ...(val as Entry),
        id: key,
      }));
      list.sort((a, b) => a.finishTime - b.finishTime);
      setRawEntries(list);
    });
    return () => unsub();
  }, [raceId]);

  // Entries with computed lap numbers
  const entries = useMemo(() => computeLaps(rawEntries), [rawEntries]);

  const addEntry = useCallback(
    (entry: Omit<Entry, "id">) => {
      if (!raceId) return;
      const entriesRef = ref(db, `entries/${raceId}`);
      const newRef = push(entriesRef);
      set(newRef, { ...entry, raceId });
    },
    [raceId]
  );

  const updateEntry = useCallback(
    (entryId: string, updates: Partial<Entry>) => {
      if (!raceId) return;
      const entryRef = ref(db, `entries/${raceId}/${entryId}`);
      update(entryRef, updates);
    },
    [raceId]
  );

  const deleteEntry = useCallback(
    (entryId: string) => {
      if (!raceId) return;
      const entryRef = ref(db, `entries/${raceId}/${entryId}`);
      remove(entryRef);
    },
    [raceId]
  );

  const myEntries = timerId
    ? entries.filter((e) => e.timerId === timerId)
    : entries;

  const lapCounts = useMemo(() => getLapCounts(entries), [entries]);

  return {
    entries,
    myEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    isOnline,
    lapCounts,
  };
}
