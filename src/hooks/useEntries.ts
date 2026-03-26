"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  serverTimestamp,
  off,
} from "firebase/database";
import { Entry } from "@/lib/types";

export function useEntries(raceId: string | null, timerId?: string) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const localQueueRef = useRef<Entry[]>([]);

  // Monitor connection status
  useEffect(() => {
    const connRef = ref(db, ".info/connected");
    const unsub = onValue(connRef, (snap) => {
      const connected = snap.val() === true;
      setIsOnline(connected);
      // Firebase RTDB handles offline queueing automatically
      // Writes made offline are queued and synced on reconnect
    });
    return () => unsub();
  }, []);

  // Listen to entries
  useEffect(() => {
    if (!raceId) return;
    const entriesRef = ref(db, `entries/${raceId}`);
    const unsub = onValue(entriesRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setEntries([]);
        return;
      }
      const list: Entry[] = Object.entries(data).map(([key, val]) => ({
        ...(val as Entry),
        id: key,
      }));
      // Sort by finishTime
      list.sort((a, b) => a.finishTime - b.finishTime);
      setEntries(list);
    });
    return () => unsub();
  }, [raceId]);

  const addEntry = useCallback(
    (entry: Omit<Entry, "id">) => {
      if (!raceId) return;
      const entriesRef = ref(db, `entries/${raceId}`);
      const newRef = push(entriesRef);
      set(newRef, {
        ...entry,
        raceId,
      });
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

  // Filter entries for a specific timer if timerId is provided
  const myEntries = timerId
    ? entries.filter((e) => e.timerId === timerId)
    : entries;

  return {
    entries,
    myEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    isOnline,
  };
}
