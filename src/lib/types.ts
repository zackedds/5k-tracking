export interface Race {
  id: string;
  name: string;
  createdAt: string; // ISO date string, auto-set on creation
  status: "setup" | "active" | "finished";
  startTime: number | null; // server timestamp ms
  roomCode: string;
  overseerPin: string;
  totalLaps: number; // runner must complete this many laps to finish
  dedupWindowSeconds: number; // same bib within this many seconds = duplicate (default 60)
}

export interface Entry {
  id: string;
  raceId: string;
  timerId: string; // unique per browser session
  timerName: string; // volunteer's name
  bibNumber: number; // bib number
  lap: number; // computed dynamically, not stored
  isDuplicate: boolean; // flagged by dedup logic
  finishTime: number; // ms elapsed since race start
  capturedAt: number; // server timestamp ms
  status: "logged" | "confirmed" | "disputed";
}
