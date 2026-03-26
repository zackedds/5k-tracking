"use client";
import { useRef, useCallback, useState } from "react";

interface QuickCaptureProps {
  onCapture: () => void;
  captureCount: number;
  isRunning: boolean;
}

export default function QuickCapture({ onCapture, captureCount, isRunning }: QuickCaptureProps) {
  const lastTapRef = useRef<number>(0);
  const [flash, setFlash] = useState(false);
  const [lastTime, setLastTime] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    if (!isRunning) return;

    // Debounce at 300ms
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;

    onCapture();

    // Visual flash feedback (works on ALL devices, unlike vibrate)
    setFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlash(false), 150);

    // Show last capture time
    const d = new Date();
    setLastTime(
      `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`
    );

    // Haptic (Android only, fails silently on iOS)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [onCapture, isRunning]);

  return (
    <div className="flex-1 p-4 flex flex-col">
      <button
        onPointerDown={handleTap}
        disabled={!isRunning}
        className={`flex-1 rounded-3xl text-white font-bold flex flex-col items-center justify-center gap-4 select-none transition-all ${
          flash
            ? "bg-white scale-[0.98]"
            : isRunning
            ? "bg-green-500 shadow-2xl"
            : "bg-gray-400"
        }`}
        style={{ minHeight: "60vh", touchAction: "manipulation" }}
      >
        <div className={`text-6xl font-black tracking-tight transition-colors ${flash ? "text-green-600" : ""}`}>
          FINISH
        </div>
        <div className={`text-3xl font-mono px-6 py-2 rounded-2xl transition-colors ${
          flash ? "bg-green-500 text-white" : "bg-black/20"
        }`}>
          {captureCount} captured
        </div>
        {lastTime && isRunning && (
          <div className="text-lg opacity-70">
            Last: {lastTime}
          </div>
        )}
        {!isRunning && (
          <div className="text-xl opacity-70">Waiting for race start...</div>
        )}
      </button>
    </div>
  );
}
