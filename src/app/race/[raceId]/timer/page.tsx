"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRace } from "@/hooks/useRace";
import TimerView from "@/components/TimerView";

function TimerPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const raceId = params.raceId as string;
  const race = useRace(raceId);
  const [timerName, setTimerName] = useState("");
  const [timerId, setTimerId] = useState("");

  useEffect(() => {
    const name = searchParams.get("name") || localStorage.getItem("timerName") || "";
    setTimerName(name);

    // Generate a stable ID for this browser session
    let id = localStorage.getItem(`timerId_${raceId}`);
    if (!id) {
      id = `timer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem(`timerId_${raceId}`, id);
    }
    setTimerId(id);
  }, [searchParams, raceId]);

  // Keep session saved with actual race name for rejoin
  useEffect(() => {
    if (!race || !timerName) return;
    localStorage.setItem(
      "activeSession",
      JSON.stringify({
        raceId,
        raceName: race.name,
        roomCode: race.roomCode,
        role: "timer",
        timerName,
        savedAt: Date.now(),
      })
    );
  }, [race, raceId, timerName]);

  if (!race) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-gray-500 text-xl">Loading race...</div>
      </div>
    );
  }

  if (!timerId) return null;

  return (
    <TimerView
      raceId={raceId}
      timerId={timerId}
      timerName={timerName || "Unknown Timer"}
      totalLaps={race.totalLaps}
      dedupWindowSeconds={race.dedupWindowSeconds || 60}
    />
  );
}

export default function TimerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-dvh text-gray-500">Loading...</div>}>
      <TimerPageInner />
    </Suspense>
  );
}
