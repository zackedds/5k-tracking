"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRace, lookupRoomCode } from "@/hooks/useRace";

export default function Home() {
  const [tab, setTab] = useState<"join" | "create">("join");

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black text-center mb-2">5K Timer</h1>
        <p className="text-gray-500 text-center mb-8">Community Race Timing</p>

        <div className="flex bg-gray-200 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-3 rounded-lg font-bold text-lg transition ${
              tab === "join" ? "bg-white shadow" : "text-gray-500"
            }`}
          >
            Join Race
          </button>
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-3 rounded-lg font-bold text-lg transition ${
              tab === "create" ? "bg-white shadow" : "text-gray-500"
            }`}
          >
            Create Race
          </button>
        </div>

        {tab === "join" ? <JoinForm /> : <CreateForm />}
      </div>
    </div>
  );
}

function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code || !name) return;
    setLoading(true);
    setError("");
    try {
      const raceId = await lookupRoomCode(code.toUpperCase());
      if (!raceId) {
        setError("Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }
      localStorage.setItem("timerName", name);
      router.push(`/race/${raceId}/timer?name=${encodeURIComponent(name)}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1">Your Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sarah"
          className="w-full h-14 px-4 text-xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1">Room Code</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. AB12"
          maxLength={4}
          className="w-full h-14 px-4 text-2xl font-mono text-center tracking-[0.5em] border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none uppercase"
        />
      </div>
      {error && <div className="text-red-600 text-sm font-bold">{error}</div>}
      <button
        onClick={handleJoin}
        disabled={loading || !code || !name}
        className="w-full h-14 bg-blue-600 text-white text-xl font-bold rounded-xl disabled:bg-gray-300 shadow-lg"
      >
        {loading ? "Joining..." : "Join Race"}
      </button>
    </div>
  );
}

function CreateForm() {
  const router = useRouter();
  const [raceName, setRaceName] = useState("");
  const [pin, setPin] = useState("");
  const [totalLaps, setTotalLaps] = useState("6");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!raceName || !pin) return;
    setLoading(true);

    const laps = parseInt(totalLaps) || 1;

    try {
      const raceId = await createRace(raceName, pin, laps);
      router.push(`/race/${raceId}/overseer?pin=${encodeURIComponent(pin)}`);
    } catch {
      alert("Failed to create race. Check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1">Race Name</label>
        <input
          type="text"
          value={raceName}
          onChange={(e) => setRaceName(e.target.value)}
          placeholder="e.g. Spring 5K 2026"
          className="w-full h-14 px-4 text-xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1">Number of Laps</label>
        <input
          type="number"
          inputMode="numeric"
          value={totalLaps}
          onChange={(e) => setTotalLaps(e.target.value)}
          min={1}
          max={99}
          className="w-full h-14 px-4 text-xl text-center border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">A runner finishes when they complete this many laps</p>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-600 mb-1">Overseer PIN</label>
        <input
          type="text"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="4-digit PIN"
          maxLength={6}
          className="w-full h-14 px-4 text-xl text-center font-mono tracking-widest border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
        Share the room code with your volunteers. Anyone with the code can join as a timer — no setup needed.
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || !raceName || !pin}
        className="w-full h-14 bg-green-600 text-white text-xl font-bold rounded-xl disabled:bg-gray-300 shadow-lg"
      >
        {loading ? "Creating..." : "Create Race"}
      </button>
    </div>
  );
}
