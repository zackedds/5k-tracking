"use client";
import { useState, useCallback, useRef, useMemo } from "react";
import { useRaceClock } from "@/hooks/useRaceClock";
import { useEntries } from "@/hooks/useEntries";
import RaceClock from "./RaceClock";
import EntryList from "./EntryList";

interface TimerViewProps {
  raceId: string;
  timerId: string;
  timerName: string;
  totalLaps: number;
  dedupWindowSeconds: number;
}

export default function TimerView({
  raceId,
  timerId,
  timerName,
  totalLaps,
  dedupWindowSeconds,
}: TimerViewProps) {
  const { elapsed, isRunning, getServerNow, startTime } = useRaceClock(raceId);
  const { entries, addEntry, updateEntry, deleteEntry, isOnline, lapCounts } =
    useEntries(raceId, dedupWindowSeconds);
  const [bibInput, setBibInput] = useState("");
  const [logFlash, setLogFlash] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{
    id: string;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myEntries = useMemo(
    () => entries.filter((e) => e.timerId === timerId),
    [entries, timerId]
  );

  const vibrate = (ms: number) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  const showWarning = (msg: string) => {
    setWarning(msg);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => setWarning(null), 4000);
  };

  const flashLog = () => {
    setLogFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setLogFlash(false), 300);
  };

  const logEntry = useCallback(
    (bibNumber: number) => {
      if (!isRunning || !startTime) return;
      const now = getServerNow();
      const finishTime = now - startTime;

      addEntry({
        raceId,
        timerId,
        timerName,
        bibNumber,
        lap: 0,
        finishTime,
        capturedAt: now,
        status: "logged",
      });

      vibrate(50);
    },
    [isRunning, startTime, getServerNow, addEntry, raceId, timerId, timerName]
  );

  const handleLog = () => {
    const bib = parseInt(bibInput);
    if (isNaN(bib) || bib <= 0) return;

    const currentLaps = lapCounts[bib] || 0;
    if (currentLaps >= totalLaps) {
      showWarning(`Bib #${bib} already finished all ${totalLaps} laps! Logging anyway.`);
      vibrate(200);
    }

    logEntry(bib);
    flashLog();
    setBibInput("");
    inputRef.current?.focus();
  };

  const handleAssignBib = (entryId: string, bib: number) => {
    const globalLaps = lapCounts[bib] || 0;
    if (globalLaps >= totalLaps) {
      showWarning(
        `Bib #${bib} already has ${globalLaps}/${totalLaps} laps. Assigning anyway — check for errors.`
      );
      vibrate(200);
    }
    updateEntry(entryId, { bibNumber: bib });
  };

  const handleDelete = (entryId: string) => {
    if (recentlyDeleted) {
      clearTimeout(recentlyDeleted.timeout);
      deleteEntry(recentlyDeleted.id);
    }

    const timeout = setTimeout(() => {
      deleteEntry(entryId);
      setRecentlyDeleted(null);
    }, 5000);

    setRecentlyDeleted({ id: entryId, timeout });
    showWarning("Entry deleted. Tap UNDO to restore.");
  };

  const handleUndo = () => {
    if (recentlyDeleted) {
      clearTimeout(recentlyDeleted.timeout);
      setRecentlyDeleted(null);
      setWarning(null);
      showWarning("Entry restored.");
    }
  };

  const handleFlag = (entryId: string) => {
    updateEntry(entryId, { status: "disputed" });
    showWarning("Entry flagged for review. Overseer will see it.");
    vibrate(100);
  };

  const visibleEntries = recentlyDeleted
    ? myEntries.filter((e) => e.id !== recentlyDeleted.id)
    : myEntries;

  const previewBib = parseInt(bibInput);
  const previewLaps = !isNaN(previewBib) ? lapCounts[previewBib] || 0 : null;

  return (
    <div
      className={`h-dvh flex flex-col transition-colors ${logFlash ? "bg-green-100" : "bg-gray-50"}`}
    >
      {!isOnline && (
        <div className="bg-yellow-500 text-yellow-900 text-center py-2 font-bold text-sm">
          OFFLINE — entries will sync when connected
        </div>
      )}

      {warning && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-center py-2 px-4 font-bold text-sm flex items-center justify-center gap-3">
          <span>{warning}</span>
          {recentlyDeleted && (
            <button
              onClick={handleUndo}
              className="bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-bold"
            >
              UNDO
            </button>
          )}
        </div>
      )}

      <RaceClock elapsed={elapsed} isRunning={isRunning} />

      {/* Bib Entry */}
      <div className="p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={bibInput}
            onChange={(e) => setBibInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLog();
            }}
            placeholder="Bib #"
            className="flex-1 h-16 text-center text-3xl font-bold border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            disabled={!isRunning}
          />
          <button
            onClick={handleLog}
            disabled={!isRunning || !bibInput}
            className="h-16 px-8 bg-green-600 text-white text-2xl font-bold rounded-xl disabled:bg-gray-300 disabled:text-gray-500 shadow-lg active:scale-95 transition-transform"
          >
            LOG
          </button>
        </div>
        {previewLaps !== null && previewLaps > 0 && (
          <div
            className={`text-center mt-2 font-bold text-sm ${
              previewLaps >= totalLaps ? "text-red-600" : "text-blue-600"
            }`}
          >
            Bib #{previewBib}: {previewLaps}/{totalLaps} laps
            {previewLaps >= totalLaps && " — ALREADY FINISHED"}
          </div>
        )}
        {!isRunning && (
          <div className="text-center text-gray-500 mt-2 text-sm">
            Waiting for race to start...
          </div>
        )}
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-600 text-sm uppercase">
            My Entries ({visibleEntries.length}) — {totalLaps} lap race
          </h3>
        </div>
        <EntryList
          entries={visibleEntries}
          onEditBib={handleAssignBib}
          onDelete={handleDelete}
          onFlag={handleFlag}
          totalLaps={totalLaps}
          lapCounts={lapCounts}
        />
      </div>
    </div>
  );
}
