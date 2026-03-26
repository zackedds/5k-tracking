"use client";
import { Entry } from "@/lib/types";
import { formatTime } from "@/lib/timeFormat";
import { useState } from "react";

interface EntryListProps {
  entries: Entry[];
  bibRangeStart?: number;
  bibRangeEnd?: number;
  onAssignBib?: (entryId: string, bib: number) => void;
  onDelete?: (entryId: string) => void;
  compact?: boolean;
}

export default function EntryList({
  entries,
  bibRangeStart,
  bibRangeEnd,
  onAssignBib,
  onDelete,
  compact = false,
}: EntryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBib, setEditBib] = useState("");

  const isInRange = (bib: number) => {
    if (!bibRangeStart || !bibRangeEnd) return true;
    return bib >= bibRangeStart && bib <= bibRangeEnd;
  };

  const handleAssign = (entryId: string) => {
    const bib = parseInt(editBib);
    if (!isNaN(bib) && bib > 0 && onAssignBib) {
      onAssignBib(entryId, bib);
      setEditingId(null);
      setEditBib("");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {entries.length === 0 && (
        <div className="text-center text-gray-400 py-8 text-lg">
          No entries yet
        </div>
      )}
      {[...entries].reverse().map((entry) => {
        const unassigned = entry.bibNumber === null;
        const outOfRange =
          entry.bibNumber !== null && !isInRange(entry.bibNumber);

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 ${
              unassigned
                ? "border-yellow-400 bg-yellow-50"
                : outOfRange
                ? "border-amber-400 bg-amber-50"
                : "border-green-400 bg-green-50"
            } ${compact ? "text-sm" : ""}`}
          >
            <div className="font-mono text-lg font-bold min-w-[80px]">
              {formatTime(entry.finishTime)}
            </div>

            {editingId === entry.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={editBib}
                  onChange={(e) => setEditBib(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAssign(entry.id);
                  }}
                  autoFocus
                  className="w-24 h-10 text-center text-lg font-bold border-2 border-blue-400 rounded-lg"
                  placeholder="Bib #"
                />
                <button
                  onClick={() => handleAssign(entry.id)}
                  className="bg-blue-500 text-white px-3 py-2 rounded-lg font-bold text-sm"
                >
                  OK
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditBib("");
                  }}
                  className="text-gray-500 px-2 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  {unassigned ? (
                    <button
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditBib("");
                      }}
                      className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-lg font-bold text-base"
                    >
                      ??? Assign Bib
                    </button>
                  ) : (
                    <span
                      className={`font-bold text-xl ${
                        outOfRange ? "text-amber-700" : "text-green-800"
                      }`}
                      onClick={() => {
                        if (onAssignBib) {
                          setEditingId(entry.id);
                          setEditBib(entry.bibNumber?.toString() || "");
                        }
                      }}
                    >
                      Bib #{entry.bibNumber}
                      {outOfRange && (
                        <span className="text-xs ml-2 text-amber-600">
                          OUT OF RANGE
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-red-400 text-sm px-2 py-1"
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
