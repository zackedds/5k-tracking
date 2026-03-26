"use client";
import { useState, useMemo } from "react";
import { useRaceClock } from "@/hooks/useRaceClock";
import { useEntries } from "@/hooks/useEntries";
import { useRace, startRace, finishRace } from "@/hooks/useRace";
import { formatTime } from "@/lib/timeFormat";
import { exportResultsCSV, downloadCSV } from "@/lib/csvExport";
import RaceClock from "./RaceClock";

interface OverseerDashboardProps {
  raceId: string;
}

export default function OverseerDashboard({ raceId }: OverseerDashboardProps) {
  const race = useRace(raceId);
  const { elapsed, isRunning } = useRaceClock(raceId);
  const { entries, updateEntry, deleteEntry, isOnline, addEntry, lapCounts } = useEntries(raceId);
  const [filter, setFilter] = useState<"all" | "unassigned" | "finished" | "in-progress" | "flagged">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBib, setEditBib] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newBib, setNewBib] = useState("");
  const [newTime, setNewTime] = useState("");

  const totalLaps = race?.totalLaps || 1;

  // Runners who have completed all laps
  const finishedBibs = useMemo(() => {
    return new Set(
      Object.entries(lapCounts)
        .filter(([, count]) => count >= totalLaps)
        .map(([bib]) => parseInt(bib))
    );
  }, [lapCounts, totalLaps]);

  // Runners in progress (at least 1 lap but not done)
  const inProgressBibs = useMemo(() => {
    return new Set(
      Object.entries(lapCounts)
        .filter(([, count]) => count > 0 && count < totalLaps)
        .map(([bib]) => parseInt(bib))
    );
  }, [lapCounts, totalLaps]);

  // Flagged entries
  const flaggedCount = useMemo(
    () => entries.filter((e) => e.status === "disputed").length,
    [entries]
  );

  // Bibs with more laps than expected (over-logged)
  const overLoggedBibs = useMemo(() => {
    return new Set(
      Object.entries(lapCounts)
        .filter(([, count]) => count > totalLaps)
        .map(([bib]) => parseInt(bib))
    );
  }, [lapCounts, totalLaps]);

  // Bibs with no laps logged at all
  const loggedBibs = useMemo(
    () => new Set(entries.filter((e) => e.bibNumber !== null).map((e) => e.bibNumber!)),
    [entries]
  );
  const missingBibs = useMemo(
    () => (race?.bibs || []).filter((b) => !loggedBibs.has(b)),
    [race?.bibs, loggedBibs]
  );

  const unassignedCount = entries.filter((e) => e.bibNumber === null).length;

  // Filtered entries
  const filteredEntries = useMemo(() => {
    switch (filter) {
      case "unassigned":
        return entries.filter((e) => e.bibNumber === null);
      case "finished":
        return entries.filter((e) => e.bibNumber !== null && e.lap === totalLaps);
      case "in-progress":
        return entries.filter((e) => e.bibNumber !== null && inProgressBibs.has(e.bibNumber));
      case "flagged":
        return entries.filter((e) => e.status === "disputed");
      default:
        return entries;
    }
  }, [entries, filter, totalLaps, inProgressBibs]);

  const handleStartRace = async () => {
    if (confirm("Start the race? This will begin the clock for all timers.")) {
      await startRace(raceId);
    }
  };

  const handleFinishRace = async () => {
    if (confirm("End the race? Timers can still log entries after this.")) {
      await finishRace(raceId);
    }
  };

  const handleExport = () => {
    // Warn about issues before export
    const warnings: string[] = [];
    if (unassignedCount > 0) {
      warnings.push(`${unassignedCount} entries have no bib assigned`);
    }
    if (flaggedCount > 0) {
      warnings.push(`${flaggedCount} entries are flagged for review`);
    }
    if (overLoggedBibs.size > 0) {
      warnings.push(`${overLoggedBibs.size} bibs have more laps than expected`);
    }

    if (warnings.length > 0) {
      const proceed = confirm(
        `Warning before export:\n\n${warnings.map((w) => "- " + w).join("\n")}\n\nExport anyway?`
      );
      if (!proceed) return;
    }

    const csv = exportResultsCSV(entries, totalLaps);
    if (!csv) {
      alert("No finished runners to export.");
      return;
    }
    downloadCSV(csv, `${race?.name || "race"}-results.csv`);
  };

  const handleAddEntry = () => {
    const bib = parseInt(newBib);
    const timeParts = newTime.split(":").map(Number);
    if (isNaN(bib) || timeParts.length < 2) return;
    const ms = (timeParts[0] * 60 + timeParts[1]) * 1000;

    addEntry({
      raceId,
      timerId: "overseer",
      timerName: "Overseer",
      bibNumber: bib,
      lap: 0,
      finishTime: ms,
      capturedAt: Date.now(),
      status: "logged",
    });

    setNewBib("");
    setNewTime("");
    setShowAddEntry(false);
  };

  const handleSaveEdit = (entryId: string) => {
    const bib = parseInt(editBib);
    if (!isNaN(bib) && bib > 0) {
      updateEntry(entryId, { bibNumber: bib });
    }
    setEditingId(null);
    setEditBib("");
  };

  const handleUnflag = (entryId: string) => {
    updateEntry(entryId, { status: "confirmed" });
  };

  if (!race) {
    return <div className="flex items-center justify-center h-dvh text-gray-500">Loading race...</div>;
  }

  const timerColors: Record<string, string> = {};
  if (race.timers) {
    Object.entries(race.timers).forEach(([id, t]) => {
      timerColors[id] = t.color;
    });
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-100">
      {!isOnline && (
        <div className="bg-yellow-500 text-yellow-900 text-center py-2 font-bold text-sm">
          OFFLINE — data may be stale
        </div>
      )}

      <RaceClock elapsed={elapsed} isRunning={isRunning} />

      {/* Header Controls */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold">{race.name}</h1>
            <div className="text-sm text-gray-500">
              Room: <span className="font-mono font-bold">{race.roomCode}</span>
              {" "}&bull; {totalLaps} lap{totalLaps > 1 ? "s" : ""}
            </div>
          </div>
          <div className="flex gap-2">
            {race.status === "setup" && (
              <button
                onClick={handleStartRace}
                className="bg-green-600 text-white px-5 py-2 rounded-xl font-bold shadow"
              >
                Start Race
              </button>
            )}
            {race.status === "active" && (
              <button
                onClick={handleFinishRace}
                className="bg-red-600 text-white px-5 py-2 rounded-xl font-bold shadow"
              >
                End Race
              </button>
            )}
            <button
              onClick={handleExport}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-2 text-sm flex-wrap">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-bold">
            {finishedBibs.size} finished
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-bold">
            {inProgressBibs.size} in progress
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg font-bold">
            {unassignedCount} unassigned
          </div>
          {flaggedCount > 0 && (
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-lg font-bold">
              {flaggedCount} flagged
            </div>
          )}
          {overLoggedBibs.size > 0 && (
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-lg font-bold">
              {overLoggedBibs.size} over-logged
            </div>
          )}
          <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-bold">
            {missingBibs.length} not seen
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white border-b px-4 py-2 gap-2 overflow-x-auto">
        {(["all", "finished", "in-progress", "unassigned", "flagged"] as const).map((f) => {
          const labels: Record<string, string> = {
            all: "All",
            finished: "Finished",
            "in-progress": "In Progress",
            unassigned: "Unassigned",
            flagged: `Flagged (${flaggedCount})`,
          };
          // Hide flagged tab if none
          if (f === "flagged" && flaggedCount === 0) return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap ${
                filter === f
                  ? f === "flagged" ? "bg-red-600 text-white" : "bg-gray-800 text-white"
                  : f === "flagged" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
        <button
          onClick={() => setShowAddEntry(!showAddEntry)}
          className="ml-auto bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap"
        >
          + Add
        </button>
      </div>

      {/* Add Entry Form */}
      {showAddEntry && (
        <div className="bg-blue-50 border-b p-3 flex gap-2 items-center">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Bib #"
            value={newBib}
            onChange={(e) => setNewBib(e.target.value)}
            className="w-24 h-10 text-center border-2 rounded-lg font-bold"
          />
          <input
            type="text"
            placeholder="MM:SS"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="w-24 h-10 text-center border-2 rounded-lg font-mono"
          />
          <button
            onClick={handleAddEntry}
            className="bg-blue-600 text-white px-4 h-10 rounded-lg font-bold"
          >
            Add
          </button>
        </div>
      )}

      {/* Missing Bibs Collapsible */}
      {filter === "all" && missingBibs.length > 0 && (
        <details className="bg-gray-50 border-b px-4 py-2">
          <summary className="text-sm font-bold text-gray-600 cursor-pointer">
            Not seen yet ({missingBibs.length})
          </summary>
          <div className="flex flex-wrap gap-1 mt-2">
            {missingBibs.map((b) => (
              <span key={b} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                {b}
              </span>
            ))}
          </div>
        </details>
      )}

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1">
          {filteredEntries.map((entry) => {
            const isFinalLap = entry.bibNumber !== null && entry.lap === totalLaps;
            const isFlagged = entry.status === "disputed";
            const isOverLogged = entry.bibNumber !== null && overLoggedBibs.has(entry.bibNumber);
            const colorMap: Record<string, string> = {
              red: "border-l-red-500",
              blue: "border-l-blue-500",
              green: "border-l-green-500",
            };
            const timerColor = timerColors[entry.timerId] || "";

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-l-4 ${
                  colorMap[timerColor] || "border-l-gray-400"
                } ${
                  isFlagged
                    ? "border-red-400 bg-red-50"
                    : isOverLogged
                    ? "border-orange-400 bg-orange-50"
                    : isFinalLap
                    ? "border-green-400 bg-green-50"
                    : entry.bibNumber === null
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="font-mono font-bold text-base min-w-[70px]">
                  {formatTime(entry.finishTime)}
                </div>

                {editingId === entry.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editBib}
                      onChange={(e) => setEditBib(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(entry.id);
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditBib("");
                        }
                      }}
                      autoFocus
                      className="w-20 h-8 text-center border-2 border-blue-400 rounded font-bold"
                    />
                    <button
                      onClick={() => handleSaveEdit(entry.id)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-bold"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex-1 font-bold cursor-pointer"
                    onClick={() => {
                      setEditingId(entry.id);
                      setEditBib(entry.bibNumber?.toString() || "");
                    }}
                  >
                    {entry.bibNumber !== null ? (
                      <span>
                        Bib #{entry.bibNumber}
                        <span className="text-sm ml-1 font-normal text-gray-500">
                          L{entry.lap}/{totalLaps}
                        </span>
                        {isFinalLap && (
                          <span className="ml-1 bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                            DONE
                          </span>
                        )}
                        {isFlagged && (
                          <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                            FLAGGED
                          </span>
                        )}
                        {isOverLogged && !isFlagged && (
                          <span className="ml-1 bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                            EXTRA LAP
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-yellow-600">??? Unassigned</span>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-400 min-w-[48px] text-right">{entry.timerName}</div>

                <div className="flex gap-1">
                  {isFlagged && (
                    <button
                      onClick={() => handleUnflag(entry.id)}
                      className="bg-green-500 text-white text-xs px-2 py-1 rounded font-bold"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Delete this entry?")) deleteEntry(entry.id);
                    }}
                    className="text-red-400 text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
