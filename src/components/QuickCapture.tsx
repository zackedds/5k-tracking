"use client";
import { useRef, useCallback } from "react";

interface QuickCaptureProps {
  onCapture: () => void;
  captureCount: number;
  isRunning: boolean;
}

export default function QuickCapture({ onCapture, captureCount, isRunning }: QuickCaptureProps) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(() => {
    if (!isRunning) return;

    // Debounce at 300ms
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;

    onCapture();

    // Haptic
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [onCapture, isRunning]);

  return (
    <div className="flex-1 p-4 flex flex-col">
      <button
        onPointerDown={handleTap}
        disabled={!isRunning}
        className={`flex-1 rounded-3xl text-white font-bold flex flex-col items-center justify-center gap-4 select-none transition-colors active:brightness-110 ${
          isRunning
            ? "bg-green-500 active:bg-green-400 shadow-2xl"
            : "bg-gray-400"
        }`}
        style={{ minHeight: "60vh", touchAction: "manipulation" }}
      >
        <div className="text-6xl font-black tracking-tight">FINISH</div>
        <div className="text-3xl font-mono bg-black/20 px-6 py-2 rounded-2xl">
          {captureCount} captured
        </div>
        {!isRunning && (
          <div className="text-xl opacity-70">Waiting for race start...</div>
        )}
      </button>
    </div>
  );
}
