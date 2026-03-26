import { Entry } from "./types";
import { formatTime } from "./timeFormat";

/**
 * Export results CSV. Only includes runners who completed all laps.
 * The finish time is their final lap entry time.
 */
export function exportResultsCSV(entries: Entry[], totalLaps: number = 1): string {
  // Only include entries that represent the final lap
  const finishEntries = entries
    .filter((e) => e.bibNumber !== null && e.lap === totalLaps)
    .sort((a, b) => a.finishTime - b.finishTime);

  const rows = finishEntries.map((entry, i) => ({
    Place: i + 1,
    "Bib Number": entry.bibNumber,
    "Finish Time": formatTime(entry.finishTime),
    "Total Laps": totalLaps,
    "Timer": entry.timerName,
    Status: entry.status,
  }));

  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${(row as Record<string, unknown>)[h]}"`).join(",")
    ),
  ].join("\n");

  return csv;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
