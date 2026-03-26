"use client";
import { formatTime } from "@/lib/timeFormat";

interface RaceClockProps {
  elapsed: number;
  isRunning: boolean;
  color?: string;
}

export default function RaceClock({ elapsed, isRunning, color = "gray" }: RaceClockProps) {
  const colorClasses: Record<string, string> = {
    red: "bg-red-600",
    blue: "bg-blue-600",
    green: "bg-green-600",
    gray: "bg-gray-800",
  };

  return (
    <div className={`${colorClasses[color] || colorClasses.gray} text-white px-4 py-3 text-center`}>
      <div className="text-sm font-medium uppercase tracking-wide opacity-80">
        {isRunning ? "Race Time" : "Waiting to Start"}
      </div>
      <div className="text-4xl font-mono font-bold tabular-nums">
        {formatTime(elapsed)}
      </div>
    </div>
  );
}
