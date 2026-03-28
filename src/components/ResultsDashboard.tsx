"use client";
import { useMemo } from "react";
import { Entry } from "@/lib/types";
import { formatTime } from "@/lib/timeFormat";
import { exportResultsCSV, downloadCSV } from "@/lib/csvExport";

interface ResultsDashboardProps {
  entries: Entry[];
  totalLaps: number;
  raceName: string;
  lapCounts: Record<number, number>;
  onBack: () => void;
}

interface FinisherResult {
  place: number;
  bibNumber: number;
  finishTime: number; // final lap time
  lapTimes: number[]; // all lap finish times
}

export default function ResultsDashboard({
  entries,
  totalLaps,
  raceName,
  lapCounts,
  onBack,
}: ResultsDashboardProps) {
  // Build finisher results: only runners who completed all laps
  const finishers = useMemo(() => {
    // Get final lap entries (non-duplicate, lap === totalLaps)
    const finalLapEntries = entries.filter(
      (e) => e.bibNumber !== null && !e.isDuplicate && e.lap === totalLaps
    );

    // Sort by finish time
    const sorted = [...finalLapEntries].sort((a, b) => a.finishTime - b.finishTime);

    // For each finisher, collect all their lap times
    return sorted.map((entry, i): FinisherResult => {
      const bib = entry.bibNumber!;
      const lapTimes = entries
        .filter((e) => e.bibNumber === bib && !e.isDuplicate)
        .sort((a, b) => a.finishTime - b.finishTime)
        .map((e) => e.finishTime);

      return {
        place: i + 1,
        bibNumber: bib,
        finishTime: entry.finishTime,
        lapTimes,
      };
    });
  }, [entries, totalLaps]);

  // Runners who started but didn't finish
  const dnfRunners = useMemo(() => {
    const finishedBibs = new Set(finishers.map((f) => f.bibNumber));
    const inProgress: { bib: number; laps: number; lastTime: number }[] = [];

    Object.entries(lapCounts).forEach(([bib, count]) => {
      const bibNum = parseInt(bib);
      if (!finishedBibs.has(bibNum) && count > 0) {
        const lastEntry = entries
          .filter((e) => e.bibNumber === bibNum && !e.isDuplicate)
          .sort((a, b) => b.finishTime - a.finishTime)[0];
        inProgress.push({
          bib: bibNum,
          laps: count,
          lastTime: lastEntry?.finishTime || 0,
        });
      }
    });

    return inProgress.sort((a, b) => b.laps - a.laps || a.lastTime - b.lastTime);
  }, [lapCounts, finishers, entries]);

  const totalEntries = entries.filter((e) => !e.isDuplicate && e.bibNumber !== null).length;
  const duplicateCount = entries.filter((e) => e.isDuplicate).length;

  const handleExport = () => {
    const csv = exportResultsCSV(entries, totalLaps);
    if (!csv) {
      alert("No finished runners to export.");
      return;
    }
    downloadCSV(csv, `${raceName}-results.csv`);
  };

  // Medal colors
  const medalStyle = (place: number) => {
    if (place === 1) return "bg-yellow-400 border-yellow-500 text-yellow-900";
    if (place === 2) return "bg-gray-300 border-gray-400 text-gray-800";
    if (place === 3) return "bg-amber-600 border-amber-700 text-white";
    return "";
  };

  const placeLabel = (place: number) => {
    if (place === 1) return "1st";
    if (place === 2) return "2nd";
    if (place === 3) return "3rd";
    return `${place}th`;
  };

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-4 text-center">
        <div className="text-sm font-medium uppercase tracking-wide opacity-70">
          Race Complete
        </div>
        <h1 className="text-2xl font-black">{raceName}</h1>
        <div className="text-sm opacity-70 mt-1">
          {finishers.length} finished &bull; {dnfRunners.length} DNF &bull; {totalLaps} laps
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b">
        <button
          onClick={onBack}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm"
        >
          Back to Dashboard
        </button>
        <button
          onClick={handleExport}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex-1"
        >
          Export Results CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Podium — Top 3 */}
        {finishers.length > 0 && (
          <div className="px-4 py-4">
            <div className="flex gap-3 justify-center items-end">
              {/* 2nd place */}
              {finishers.length > 1 && (
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-full rounded-xl border-2 p-3 text-center ${medalStyle(2)}`}>
                    <div className="text-lg font-bold">2nd</div>
                    <div className="text-3xl font-black">#{finishers[1].bibNumber}</div>
                    <div className="font-mono font-bold mt-1">
                      {formatTime(finishers[1].finishTime)}
                    </div>
                  </div>
                </div>
              )}
              {/* 1st place */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-full rounded-xl border-2 p-4 text-center ${medalStyle(1)}`}>
                  <div className="text-xl font-bold">1st</div>
                  <div className="text-4xl font-black">#{finishers[0].bibNumber}</div>
                  <div className="font-mono font-bold text-lg mt-1">
                    {formatTime(finishers[0].finishTime)}
                  </div>
                </div>
              </div>
              {/* 3rd place */}
              {finishers.length > 2 && (
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-full rounded-xl border-2 p-3 text-center ${medalStyle(3)}`}>
                    <div className="text-lg font-bold">3rd</div>
                    <div className="text-3xl font-black">#{finishers[2].bibNumber}</div>
                    <div className="font-mono font-bold mt-1">
                      {formatTime(finishers[2].finishTime)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="flex gap-2 px-4 pb-3 text-sm">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-bold">
            {finishers.length} finished
          </div>
          <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-bold">
            {totalEntries} total entries
          </div>
          <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg font-bold">
            {duplicateCount} dups filtered
          </div>
        </div>

        {/* Full results table */}
        <div className="px-4 pb-2">
          <h2 className="font-bold text-gray-600 text-sm uppercase mb-2">
            Full Results
          </h2>
        </div>
        <div className="px-4 pb-2">
          {finishers.map((result) => (
            <div
              key={result.bibNumber}
              className={`flex items-center gap-3 px-3 py-2 border-b border-gray-200 ${
                result.place <= 3 ? "bg-white" : ""
              }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${
                  result.place <= 3
                    ? medalStyle(result.place)
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {placeLabel(result.place)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg">Bib #{result.bibNumber}</div>
                {result.lapTimes.length > 1 && (
                  <div className="text-xs text-gray-400">
                    Laps: {result.lapTimes.map((t) => formatTime(t)).join(" / ")}
                  </div>
                )}
              </div>
              <div className="font-mono font-bold text-lg">
                {formatTime(result.finishTime)}
              </div>
            </div>
          ))}
        </div>

        {/* DNF section */}
        {dnfRunners.length > 0 && (
          <div className="px-4 py-3">
            <h2 className="font-bold text-gray-600 text-sm uppercase mb-2">
              Did Not Finish ({dnfRunners.length})
            </h2>
            {dnfRunners.map((runner) => (
              <div
                key={runner.bib}
                className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 text-gray-500"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 font-bold text-xs">
                  DNF
                </div>
                <div className="flex-1">
                  <div className="font-bold">Bib #{runner.bib}</div>
                  <div className="text-xs">
                    {runner.laps}/{totalLaps} laps completed
                  </div>
                </div>
                <div className="font-mono text-sm">
                  Last: {formatTime(runner.lastTime)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
