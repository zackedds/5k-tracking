import { Entry } from "./types";
import { formatTime } from "./timeFormat";

export function exportResultsCSV(entries: Entry[]): string {
  const sorted = [...entries]
    .filter((e) => e.bibNumber !== null)
    .sort((a, b) => a.finishTime - b.finishTime);

  const rows = sorted.map((entry, i) => ({
    Place: i + 1,
    "Bib Number": entry.bibNumber,
    "Finish Time": formatTime(entry.finishTime),
    "Timer ID": entry.timerName,
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
