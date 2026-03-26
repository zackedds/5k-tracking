"use client";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, set, update, get, push } from "firebase/database";
import { Race, TimerConfig } from "@/lib/types";

export function useRace(raceId: string | null) {
  const [race, setRace] = useState<Race | null>(null);

  useEffect(() => {
    if (!raceId) return;
    const raceRef = ref(db, `races/${raceId}`);
    const unsub = onValue(raceRef, (snap) => {
      const data = snap.val();
      if (data) {
        setRace({ ...data, id: raceId });
      } else {
        setRace(null);
      }
    });
    return () => unsub();
  }, [raceId]);

  return race;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createRace(
  name: string,
  date: string,
  overseerPin: string,
  timers: Record<string, TimerConfig>
): Promise<string> {
  const roomCode = generateRoomCode();

  // Generate bib list from timer ranges
  const bibs: number[] = [];
  Object.values(timers).forEach((t) => {
    for (let i = t.bibRangeStart; i <= t.bibRangeEnd; i++) {
      bibs.push(i);
    }
  });

  const racesRef = ref(db, "races");
  const newRaceRef = push(racesRef);
  const raceId = newRaceRef.key!;

  const race: Omit<Race, "id"> = {
    name,
    date,
    status: "setup",
    startTime: null,
    roomCode,
    overseerPin,
    bibs,
    timers,
  };

  await set(newRaceRef, race);

  // Also store a lookup by room code
  await set(ref(db, `roomCodes/${roomCode}`), raceId);

  return raceId;
}

export async function lookupRoomCode(code: string): Promise<string | null> {
  const snap = await get(ref(db, `roomCodes/${code.toUpperCase()}`));
  return snap.val();
}

export async function startRace(raceId: string) {
  const serverNow = Date.now(); // Will be close enough; offset is handled client-side
  // Use a more precise approach: write server timestamp
  await update(ref(db, `races/${raceId}`), {
    status: "active",
    startTime: serverNow,
  });
}

export async function finishRace(raceId: string) {
  await update(ref(db, `races/${raceId}`), {
    status: "finished",
  });
}
