"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRace, lookupRoomCode } from "@/hooks/useRace";
import { TimerConfig } from "@/lib/types";

export default function Home() {
  const [tab, setTab] = useState<"join" | "create">("join");

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black text-center mb-2">5K Timer</h1>
        <p className="text-gray-500 text-center mb-8">Community Race Timing</p>

        {/* Tabs */}
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
          placeholder="e.g. ABC123"
          maxLength={6}
          className="w-full h-14 px-4 text-xl font-mono text-center tracking-widest border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none uppercase"
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
  const [raceDate, setRaceDate] = useState(new Date().toISOString().split("T")[0]);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!raceName || !pin) return;
    setLoading(true);

    const timers: Record<string, TimerConfig> = {
      timer1: { name: "Timer 1", bibRangeStart: 100, bibRangeEnd: 399, color: "red" },
      timer2: { name: "Timer 2", bibRangeStart: 400, bibRangeEnd: 699, color: "blue" },
      timer3: { name: "Timer 3", bibRangeStart: 700, bibRangeEnd: 999, color: "green" },
    };

    try {
      const raceId = await createRace(raceName, raceDate, pin, timers);
      router.push(`/race/${raceId}/overseer?pin=${encodeURIComponent(pin)}`);
    } catch {
      alert("Failed to create race. Check your Firebase config.");
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
        <label className="block text-sm font-bold text-gray-600 mb-1">Date</label>
        <input
          type="date"
          value={raceDate}
          onChange={(e) => setRaceDate(e.target.value)}
          className="w-full h-14 px-4 text-xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
        />
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
        <div className="font-bold mb-2">Default Timer Assignments:</div>
        <div className="flex flex-col gap-1">
          <div><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2" />Timer 1: Bibs 100-399</div>
          <div><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2" />Timer 2: Bibs 400-699</div>
          <div><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2" />Timer 3: Bibs 700-999</div>
        </div>
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
