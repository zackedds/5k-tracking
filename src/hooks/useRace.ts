"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, set, update, get, push } from "firebase/database";
import { Race } from "@/lib/types";

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
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createRace(
  name: string,
  overseerPin: string,
  totalLaps: number,
  dedupWindowSeconds: number = 60
): Promise<string> {
  const roomCode = generateRoomCode();

  const racesRef = ref(db, "races");
  const newRaceRef = push(racesRef);
  const raceId = newRaceRef.key!;

  const race: Omit<Race, "id"> = {
    name,
    createdAt: new Date().toISOString(),
    status: "setup",
    startTime: null,
    roomCode,
    overseerPin,
    totalLaps,
    dedupWindowSeconds,
  };

  await set(newRaceRef, race);
  await set(ref(db, `roomCodes/${roomCode}`), raceId);

  return raceId;
}

export async function lookupRoomCode(code: string): Promise<string | null> {
  const snap = await get(ref(db, `roomCodes/${code.toUpperCase()}`));
  return snap.val();
}

export async function startRace(raceId: string) {
  await update(ref(db, `races/${raceId}`), {
    status: "active",
    startTime: Date.now(),
  });
}

export async function finishRace(raceId: string) {
  await update(ref(db, `races/${raceId}`), {
    status: "finished",
  });
}

export async function updateDedupWindow(raceId: string, seconds: number) {
  await update(ref(db, `races/${raceId}`), {
    dedupWindowSeconds: seconds,
  });
}
