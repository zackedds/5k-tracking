"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRace } from "@/hooks/useRace";
import OverseerDashboard from "@/components/OverseerDashboard";

function OverseerPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const raceId = params.raceId as string;
  const race = useRace(raceId);
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const urlPin = searchParams.get("pin");
    if (urlPin && race && urlPin === race.overseerPin) {
      setAuthenticated(true);
    }
  }, [searchParams, race]);

  if (!race) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-gray-500 text-xl">Loading race...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-black text-center mb-6">Overseer Login</h1>
          <input
            type="text"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (pinInput === race.overseerPin) {
                  setAuthenticated(true);
                } else {
                  setError("Wrong PIN");
                }
              }
            }}
            placeholder="Enter PIN"
            className="w-full h-14 px-4 text-2xl text-center font-mono tracking-widest border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none mb-3"
          />
          {error && <div className="text-red-600 text-sm font-bold text-center mb-3">{error}</div>}
          <button
            onClick={() => {
              if (pinInput === race.overseerPin) {
                setAuthenticated(true);
              } else {
                setError("Wrong PIN");
              }
            }}
            className="w-full h-14 bg-gray-800 text-white text-xl font-bold rounded-xl"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return <OverseerDashboard raceId={raceId} />;
}

export default function OverseerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-dvh text-gray-500">Loading...</div>}>
      <OverseerPageInner />
    </Suspense>
  );
}
