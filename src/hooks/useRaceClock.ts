"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, serverTimestamp, set, get } from "firebase/database";

/**
 * Syncs to the race clock using server time offset.
 * Firebase RTDB exposes `.info/serverTimeOffset` which gives us
 * the difference between local clock and server clock.
 */
export function useRaceClock(raceId: string | null) {
  const [elapsed, setElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const serverOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Get server time offset
  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsub = onValue(offsetRef, (snap) => {
      serverOffsetRef.current = snap.val() || 0;
    });
    return () => unsub();
  }, []);

  // Listen to race start time
  useEffect(() => {
    if (!raceId) return;
    const raceRef = ref(db, `races/${raceId}`);
    const unsub = onValue(raceRef, (snap) => {
      const data = snap.val();
      if (data) {
        setStartTime(data.startTime || null);
        setIsRunning(data.status === "active");
      }
    });
    return () => unsub();
  }, [raceId]);

  // Animate the clock
  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsed(0);
      return;
    }

    const tick = () => {
      const serverNow = Date.now() + serverOffsetRef.current;
      setElapsed(serverNow - startTime);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, startTime]);

  const getServerNow = useCallback(() => {
    return Date.now() + serverOffsetRef.current;
  }, []);

  const getElapsedAt = useCallback(
    (timestamp: number) => {
      if (!startTime) return 0;
      return timestamp - startTime;
    },
    [startTime]
  );

  return { elapsed, isRunning, startTime, getServerNow, getElapsedAt };
}
