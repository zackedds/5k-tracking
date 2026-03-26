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
  onFlag?: (entryId: string) => void;
  compact?: boolean;
  totalLaps?: number;
  lapCounts?: Record<number, number>;
}

export default function EntryList({
  entries,
  bibRangeStart,
  bibRangeEnd,
  onAssignBib,
  onDelete,
  onFlag,
  compact = false,
  totalLaps = 1,
  lapCounts = {},
}: EntryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBib, setEditBib] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        const isFinalLap = entry.lap === totalLaps;
        const isFlagged = entry.status === "disputed";
        const isExpanded = expandedId === entry.id;

        return (
          <div key={entry.id}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 ${
                isFlagged
                  ? "border-red-400 bg-red-50"
                  : unassigned
                  ? "border-yellow-400 bg-yellow-50"
                  : isFinalLap
                  ? "border-green-500 bg-green-100"
                  : outOfRange
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-300 bg-white"
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
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditBib("");
                      }
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
                  <div
                    className="flex-1"
                    onClick={() => {
                      // Tap entry to expand actions
                      setExpandedId(isExpanded ? null : entry.id);
                    }}
                  >
                    {unassigned ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
                          isFlagged ? "text-red-700" : isFinalLap ? "text-green-700" : outOfRange ? "text-amber-700" : "text-gray-800"
                        }`}
                      >
                        Bib #{entry.bibNumber}
                        <span className="text-sm ml-2 font-normal text-gray-500">
                          Lap {entry.lap}/{totalLaps}
                        </span>
                        {isFinalLap && (
                          <span className="ml-2 bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                            DONE
                          </span>
                        )}
                        {isFlagged && (
                          <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                            FLAGGED
                          </span>
                        )}
                        {outOfRange && !isFlagged && (
                          <span className="text-xs ml-2 text-amber-600">
                            OUT OF RANGE
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Expanded action buttons */}
            {isExpanded && editingId !== entry.id && (
              <div className="flex gap-2 px-3 py-2 bg-gray-100 rounded-b-lg -mt-1 border-2 border-t-0 border-gray-200">
                {onAssignBib && (
                  <button
                    onClick={() => {
                      setEditingId(entry.id);
                      setEditBib(entry.bibNumber?.toString() || "");
                      setExpandedId(null);
                    }}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex-1"
                  >
                    Edit Bib
                  </button>
                )}
                {onFlag && !isFlagged && (
                  <button
                    onClick={() => {
                      onFlag(entry.id);
                      setExpandedId(null);
                    }}
                    className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex-1"
                  >
                    Flag Error
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(entry.id);
                      setExpandedId(null);
                    }}
                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex-1"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
