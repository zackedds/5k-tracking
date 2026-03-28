"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import { Entry } from "@/lib/types";

/**
 * Compute laps and flag duplicates.
 *
 * For each bib, entries are in time order. If two entries for the same bib
 * are within `dedupWindowMs`, the later one is flagged as a duplicate and
 * doesn't count as a new lap.
 */
function processEntries(rawEntries: Entry[], dedupWindowMs: number): Entry[] {
  // Track last valid (non-duplicate) finish time per bib
  const lastValidTime: Record<number, number> = {};
  const lapCount: Record<number, number> = {};

  return rawEntries.map((e) => {
    if (e.bibNumber === null) {
      return { ...e, lap: 0, isDuplicate: false };
    }

    const bib = e.bibNumber;
    const prevTime = lastValidTime[bib];
    const isDuplicate =
      prevTime !== undefined && (e.finishTime - prevTime) < dedupWindowMs;

    if (isDuplicate) {
      return { ...e, lap: lapCount[bib] || 0, isDuplicate: true };
    }

    // Valid entry — new lap
    lapCount[bib] = (lapCount[bib] || 0) + 1;
    lastValidTime[bib] = e.finishTime;
    return { ...e, lap: lapCount[bib], isDuplicate: false };
  });
}

/** Get lap counts per bib (excluding duplicates) */
export function getLapCounts(entries: Entry[]): Record<number, number> {
  const counts: Record<number, number> = {};
  entries.forEach((e) => {
    if (e.bibNumber !== null && !e.isDuplicate) {
      counts[e.bibNumber] = (counts[e.bibNumber] || 0) + 1;
    }
  });
  return counts;
}

export function useEntries(raceId: string | null, dedupWindowSeconds: number = 60) {
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

  const dedupWindowMs = dedupWindowSeconds * 1000;
  const entries = useMemo(
    () => processEntries(rawEntries, dedupWindowMs),
    [rawEntries, dedupWindowMs]
  );

  const addEntry = useCallback(
    (entry: Omit<Entry, "id" | "isDuplicate">) => {
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

  const lapCounts = useMemo(() => getLapCounts(entries), [entries]);

  // Filter by timerId is now done at component level, not here
  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    isOnline,
    lapCounts,
  };
}
