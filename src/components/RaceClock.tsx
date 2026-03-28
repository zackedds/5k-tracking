"use client";
import { formatTime } from "@/lib/timeFormat";

interface RaceClockProps {
  elapsed: number;
  isRunning: boolean;
}

export default function RaceClock({ elapsed, isRunning }: RaceClockProps) {
  return (
    <div className="bg-gray-800 text-white px-4 py-3 text-center">
      <div className="text-sm font-medium uppercase tracking-wide opacity-80">
        {isRunning ? "Race Time" : "Waiting to Start"}
      </div>
      <div className="text-4xl font-mono font-bold tabular-nums">
        {formatTime(elapsed)}
      </div>
    </div>
  );
}
