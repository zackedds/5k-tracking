export interface Race {
  id: string;
  name: string;
  date: string;
  status: "setup" | "active" | "finished";
  startTime: number | null; // server timestamp ms
  roomCode: string;
  overseerPin: string;
  bibs: number[];
  timers: Record<string, TimerConfig>;
}

export interface TimerConfig {
  name: string;
  bibRangeStart: number;
  bibRangeEnd: number;
  color: string; // "red" | "blue" | "green"
}

export interface Entry {
  id: string;
  raceId: string;
  timerId: string;
  timerName: string;
  bibNumber: number | null; // null = unassigned (Quick Capture)
  finishTime: number; // ms elapsed since race start
  capturedAt: number; // server timestamp ms
  status: "logged" | "confirmed" | "disputed";
}

export type TimerMode = "normal" | "quickCapture";

export const BIB_RANGE_COLORS: Record<string, { label: string; bg: string; text: string; accent: string }> = {
  red: { label: "Red (100-399)", bg: "bg-red-500", text: "text-red-600", accent: "border-red-500" },
  blue: { label: "Blue (400-699)", bg: "bg-blue-500", text: "text-blue-600", accent: "border-blue-500" },
  green: { label: "Green (700-999)", bg: "bg-green-500", text: "text-green-600", accent: "border-green-500" },
};
