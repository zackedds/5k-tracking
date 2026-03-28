"use client";
import { useState, useCallback, useRef, useMemo } from "react";
import { useRaceClock } from "@/hooks/useRaceClock";
import { useEntries } from "@/hooks/useEntries";
import { TimerMode } from "@/lib/types";
import RaceClock from "./RaceClock";
import EntryList from "./EntryList";
import QuickCapture from "./QuickCapture";

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
  const [mode, setMode] = useState<TimerMode>("normal");
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
    (bibNumber: number | null) => {
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

  const handleNormalLog = () => {
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

  const handleQuickCapture = () => {
    logEntry(null);
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

  const unassignedCount = myEntries.filter((e) => e.bibNumber === null).length;

  const visibleEntries = recentlyDeleted
    ? myEntries.filter((e) => e.id !== recentlyDeleted.id)
    : myEntries;

  const previewBib = parseInt(bibInput);
  const previewLaps = !isNaN(previewBib) ? lapCounts[previewBib] || 0 : null;

  if (mode === "quickCapture") {
    return (
      <div className="h-dvh flex flex-col">
        {!isOnline && (
          <div className="bg-yellow-500 text-yellow-900 text-center py-2 font-bold text-sm">
            OFFLINE — entries will sync when connected
          </div>
        )}
        <RaceClock elapsed={elapsed} isRunning={isRunning} />
        <QuickCapture
          onCapture={handleQuickCapture}
          captureCount={myEntries.length}
          isRunning={isRunning}
        />
        <div className="p-3 bg-gray-100">
          <button
            onClick={() => setMode("normal")}
            className="w-full bg-gray-700 text-white py-3 rounded-xl font-bold text-lg"
          >
            Back to Normal Mode
            {unassignedCount > 0 && (
              <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-sm">
                {unassignedCount} unassigned
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

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

      {/* Quick Capture Toggle */}
      <div className="px-3 pt-3">
        <button
          onClick={() => setMode("quickCapture")}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-lg shadow-lg"
        >
          Quick Capture Mode
          {unassignedCount > 0 && (
            <span className="ml-2 bg-yellow-300 text-yellow-900 px-2 py-0.5 rounded-full text-sm">
              {unassignedCount} unassigned
            </span>
          )}
        </button>
      </div>

      {/* Normal Mode: Bib Entry */}
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
              if (e.key === "Enter") handleNormalLog();
            }}
            placeholder="Bib #"
            className="flex-1 h-16 text-center text-3xl font-bold border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            disabled={!isRunning}
          />
          <button
            onClick={handleNormalLog}
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
          {unassignedCount > 0 && (
            <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">
              {unassignedCount} need bibs
            </span>
          )}
        </div>
        <EntryList
          entries={visibleEntries}
          onAssignBib={handleAssignBib}
          onDelete={handleDelete}
          onFlag={handleFlag}
          totalLaps={totalLaps}
          lapCounts={lapCounts}
        />
      </div>
    </div>
  );
}
