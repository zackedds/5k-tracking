"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRace } from "@/hooks/useRace";
import TimerView from "@/components/TimerView";
import { TimerConfig } from "@/lib/types";

function TimerPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const raceId = params.raceId as string;
  const race = useRace(raceId);
  const [selectedTimer, setSelectedTimer] = useState<string | null>(null);
  const [timerName, setTimerName] = useState("");

  // Restore timer name and selection from localStorage on mount
  useEffect(() => {
    const name = searchParams.get("name") || localStorage.getItem("timerName") || "";
    setTimerName(name);

    const savedTimer = localStorage.getItem(`timer_${raceId}`);
    if (savedTimer) setSelectedTimer(savedTimer);
  }, [searchParams, raceId]);

  // Persist timer selection
  const handleSelectTimer = (timerId: string) => {
    setSelectedTimer(timerId);
    localStorage.setItem(`timer_${raceId}`, timerId);
  };

  const handleChangeTimer = () => {
    setSelectedTimer(null);
    localStorage.removeItem(`timer_${raceId}`);
  };

  if (!race) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-gray-500 text-xl">Loading race...</div>
      </div>
    );
  }

  if (selectedTimer && race.timers[selectedTimer]) {
    const config: TimerConfig = {
      ...race.timers[selectedTimer],
      name: timerName || race.timers[selectedTimer].name,
    };
    return (
      <div className="h-dvh flex flex-col">
        <TimerView raceId={raceId} timerId={selectedTimer} timerConfig={config} />
      </div>
    );
  }

  const timerEntries = Object.entries(race.timers || {});

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black text-center mb-1">{race.name}</h1>
        <p className="text-gray-500 text-center mb-2">
          Hi {timerName}! Pick your timer position:
        </p>
        <p className="text-xs text-gray-400 text-center mb-6">
          Your selection is saved — if you refresh, you&apos;ll come right back.
        </p>

        <div className="flex flex-col gap-3">
          {timerEntries.map(([id, timer]) => {
            const colorClasses: Record<string, string> = {
              red: "bg-red-500 active:bg-red-600",
              blue: "bg-blue-500 active:bg-blue-600",
              green: "bg-green-500 active:bg-green-600",
            };

            return (
              <button
                key={id}
                onClick={() => handleSelectTimer(id)}
                className={`${colorClasses[timer.color] || "bg-gray-500"} text-white py-5 rounded-2xl font-bold text-xl shadow-lg transition-transform active:scale-95`}
              >
                <div>{timer.name}</div>
                <div className="text-base opacity-80 font-normal">
                  Bibs {timer.bibRangeStart}–{timer.bibRangeEnd}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          Room: {race.roomCode} &bull; Status: {race.status}
        </div>
      </div>
    </div>
  );
}

export default function TimerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-dvh text-gray-500">Loading...</div>}>
      <TimerPageInner />
    </Suspense>
  );
}
