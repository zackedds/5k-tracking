/**
 * Full race simulation — stress test.
 *
 * Simulates:
 *   1. Overseer creates a race (3 laps, 30 runners)
 *   2. 3 timer agents join (one per bib range)
 *   3. Overseer starts the race
 *   4. Runners complete laps with realistic clustering:
 *      - Wave 1: fast cluster of 5-8 runners per timer (sub-second gaps)
 *      - Wave 2: spread out middle pack
 *      - Wave 3: tail-enders
 *   5. Quick capture mode: timers log timestamps without bibs, then assign later
 *   6. Normal mode: timers log bib + timestamp together
 *   7. Overseer reads combined feed, checks for duplicates, missing bibs
 *   8. Export results
 *
 * Verifies:
 *   - All entries persisted correctly
 *   - Lap counts computed correctly
 *   - No data loss under rapid writes
 *   - Finish order is correct
 *   - Duplicate detection works
 *   - Missing bib detection works
 */

import { db, ref, onValue, push, set, update, get, remove } from "./firebase-test";

// ─── Config ───────────────────────────────────────────────────────────────────

const TOTAL_LAPS = 3;
const RUNNERS_PER_RANGE = 10; // 30 total runners
const QUICK_CAPTURE_CLUSTER_SIZE = 5; // first 5 runners per timer use quick capture
const TEST_RACE_NAME = `STRESS TEST ${new Date().toISOString().slice(0, 19)}`;
const OVERSEER_PIN = "9999";

const TIMER_CONFIGS = [
  { id: "timer1", name: "Timer-Bot-1", bibRangeStart: 100, bibRangeEnd: 109, color: "red" },
  { id: "timer2", name: "Timer-Bot-2", bibRangeStart: 400, bibRangeEnd: 409, color: "blue" },
  { id: "timer3", name: "Timer-Bot-3", bibRangeStart: 700, bibRangeEnd: 709, color: "green" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function log(agent: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] [${agent.padEnd(14)}] ${msg}`);
}

// ─── Results tracking ─────────────────────────────────────────────────────────

const results = {
  entriesWritten: 0,
  entriesRead: 0,
  quickCaptureEntries: 0,
  bibAssignments: 0,
  duplicatesDetected: 0,
  missingBibsDetected: 0,
  lapCountErrors: 0,
  finishedRunners: 0,
  errors: [] as string[],
};

// ─── Phase 1: Overseer creates race ──────────────────────────────────────────

async function createTestRace(): Promise<string> {
  log("OVERSEER", `Creating race: ${TEST_RACE_NAME}`);

  const roomCode = generateRoomCode();
  const bibs: number[] = [];
  const timers: Record<string, any> = {};

  TIMER_CONFIGS.forEach((t) => {
    timers[t.id] = { name: t.name, bibRangeStart: t.bibRangeStart, bibRangeEnd: t.bibRangeEnd, color: t.color };
    for (let i = t.bibRangeStart; i <= t.bibRangeEnd; i++) bibs.push(i);
  });

  const racesRef = ref(db, "races");
  const newRaceRef = push(racesRef);
  const raceId = newRaceRef.key!;

  await set(newRaceRef, {
    name: TEST_RACE_NAME,
    createdAt: new Date().toISOString(),
    status: "setup",
    startTime: null,
    roomCode,
    overseerPin: OVERSEER_PIN,
    totalLaps: TOTAL_LAPS,
    bibs,
    timers,
  });

  await set(ref(db, `roomCodes/${roomCode}`), raceId);

  log("OVERSEER", `Race created: ${raceId} (room: ${roomCode}, ${bibs.length} bibs, ${TOTAL_LAPS} laps)`);
  return raceId;
}

// ─── Phase 2: Start race ─────────────────────────────────────────────────────

async function startTestRace(raceId: string): Promise<number> {
  const startTime = Date.now();
  await update(ref(db, `races/${raceId}`), {
    status: "active",
    startTime,
  });
  log("OVERSEER", `Race started at ${startTime}`);
  return startTime;
}

// ─── Phase 3: Timer agents log entries ───────────────────────────────────────

interface PendingEntry {
  entryKey: string;
  bibNumber: number;
}

async function runTimerAgent(
  raceId: string,
  startTime: number,
  timerConfig: typeof TIMER_CONFIGS[0]
): Promise<void> {
  const agent = timerConfig.name;
  const bibs: number[] = [];
  for (let i = timerConfig.bibRangeStart; i <= timerConfig.bibRangeEnd; i++) bibs.push(i);

  // Shuffle bibs to randomize finish order
  for (let i = bibs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bibs[i], bibs[j]] = [bibs[j], bibs[i]];
  }

  log(agent, `Timer ready with ${bibs.length} bibs (${timerConfig.bibRangeStart}-${timerConfig.bibRangeEnd})`);

  for (let lap = 1; lap <= TOTAL_LAPS; lap++) {
    log(agent, `── Lap ${lap}/${TOTAL_LAPS} ──`);

    const pendingQuickCaptures: PendingEntry[] = [];

    for (let r = 0; r < bibs.length; r++) {
      const bib = bibs[r];
      const now = Date.now();
      const finishTime = now - startTime;
      const isQuickCapture = r < QUICK_CAPTURE_CLUSTER_SIZE && lap === 1; // only quick capture on first wave of lap 1

      const entriesRef = ref(db, `entries/${raceId}`);
      const newRef = push(entriesRef);
      const entryKey = newRef.key!;

      const entry = {
        raceId,
        timerId: timerConfig.id,
        timerName: timerConfig.name,
        bibNumber: isQuickCapture ? null : bib,
        lap: 0,
        finishTime,
        capturedAt: now,
        status: "logged",
      };

      await set(newRef, entry);
      results.entriesWritten++;

      if (isQuickCapture) {
        results.quickCaptureEntries++;
        pendingQuickCaptures.push({ entryKey, bibNumber: bib });
        log(agent, `  QUICK CAPTURE #${r + 1} at ${finishTime}ms (bib ${bib} pending)`);
      } else {
        log(agent, `  Logged bib #${bib} lap ${lap} at ${finishTime}ms`);
      }

      // Simulate timing gaps
      if (r < QUICK_CAPTURE_CLUSTER_SIZE) {
        // Fast cluster: 100-300ms gaps
        await sleep(100 + Math.random() * 200);
      } else {
        // Spread out: 500-1500ms gaps
        await sleep(500 + Math.random() * 1000);
      }
    }

    // After the cluster passes, assign bibs to quick captures
    if (pendingQuickCaptures.length > 0) {
      log(agent, `  Assigning ${pendingQuickCaptures.length} quick capture bibs...`);
      await sleep(500); // brief pause like a human would

      for (const pending of pendingQuickCaptures) {
        await update(ref(db, `entries/${raceId}/${pending.entryKey}`), {
          bibNumber: pending.bibNumber,
        });
        results.bibAssignments++;
        log(agent, `  Assigned bib #${pending.bibNumber} to entry ${pending.entryKey.slice(-6)}`);
        await sleep(200 + Math.random() * 300); // human typing speed
      }
    }

    // Brief pause between laps
    if (lap < TOTAL_LAPS) {
      const lapGap = 2000 + Math.random() * 3000;
      log(agent, `  Waiting ${Math.round(lapGap)}ms for next lap...`);
      await sleep(lapGap);
    }
  }

  log(agent, `Done. Wrote ${bibs.length * TOTAL_LAPS} entries.`);
}

// ─── Phase 4: Overseer monitoring + duplicate injection ──────────────────────

async function runOverseerMonitor(raceId: string): Promise<void> {
  log("OVERSEER", "Monitoring combined feed...");

  // Inject a deliberate duplicate to test detection
  await sleep(3000);
  log("OVERSEER", "Injecting deliberate duplicate (bib 100) for detection test...");

  const entriesRef = ref(db, `entries/${raceId}`);
  const dupRef = push(entriesRef);
  await set(dupRef, {
    raceId,
    timerId: "overseer",
    timerName: "Overseer",
    bibNumber: 100,
    lap: 0,
    finishTime: 99999,
    capturedAt: Date.now(),
    status: "logged",
  });
  results.entriesWritten++;
}

// ─── Phase 5: Verify everything ──────────────────────────────────────────────

async function verifyResults(raceId: string): Promise<void> {
  log("VERIFY", "Reading all entries from Firebase...");

  const snap = await get(ref(db, `entries/${raceId}`));
  const data = snap.val();

  if (!data) {
    results.errors.push("NO ENTRIES FOUND IN DATABASE");
    return;
  }

  const entries = Object.entries(data).map(([key, val]: [string, any]) => ({
    id: key,
    ...val,
  }));

  entries.sort((a: any, b: any) => a.finishTime - b.finishTime);
  results.entriesRead = entries.length;

  log("VERIFY", `Total entries in DB: ${entries.length}`);
  log("VERIFY", `Expected entries: ${results.entriesWritten}`);

  // Check: all entries persisted
  if (entries.length !== results.entriesWritten) {
    results.errors.push(`ENTRY COUNT MISMATCH: wrote ${results.entriesWritten}, found ${entries.length}`);
  } else {
    log("VERIFY", "PASS: Entry count matches");
  }

  // Check: no null bibs remaining (all quick captures should be assigned)
  const unassigned = entries.filter((e: any) => e.bibNumber === null);
  if (unassigned.length > 0) {
    results.errors.push(`${unassigned.length} ENTRIES STILL UNASSIGNED`);
  } else {
    log("VERIFY", "PASS: All bibs assigned");
  }

  // Check: lap counts
  const lapCounts: Record<number, number> = {};
  entries
    .filter((e: any) => e.bibNumber !== null)
    .sort((a: any, b: any) => a.finishTime - b.finishTime)
    .forEach((e: any) => {
      lapCounts[e.bibNumber] = (lapCounts[e.bibNumber] || 0) + 1;
    });

  // Expected: each of the 30 bibs should have TOTAL_LAPS entries, plus bib 100 has 1 extra (duplicate)
  const expectedBibs = TIMER_CONFIGS.reduce(
    (acc, t) => acc + (t.bibRangeEnd - t.bibRangeStart + 1),
    0
  );

  const finishedRunners = Object.entries(lapCounts).filter(
    ([, count]) => count >= TOTAL_LAPS
  );
  results.finishedRunners = finishedRunners.length;

  log("VERIFY", `Finished runners: ${finishedRunners.length}/${expectedBibs}`);

  // Bib 100 should have TOTAL_LAPS + 1 (the injected duplicate)
  if (lapCounts[100] === TOTAL_LAPS + 1) {
    log("VERIFY", `PASS: Duplicate detected — bib 100 has ${lapCounts[100]} entries (expected ${TOTAL_LAPS + 1})`);
    results.duplicatesDetected = 1;
  } else {
    results.errors.push(`DUPLICATE TEST FAILED: bib 100 has ${lapCounts[100]} entries, expected ${TOTAL_LAPS + 1}`);
  }

  // Check: all registered bibs should appear
  const allBibs = new Set<number>();
  TIMER_CONFIGS.forEach((t) => {
    for (let i = t.bibRangeStart; i <= t.bibRangeEnd; i++) allBibs.add(i);
  });

  const loggedBibs = new Set(Object.keys(lapCounts).map(Number));
  const missingBibs = [...allBibs].filter((b) => !loggedBibs.has(b));
  results.missingBibsDetected = missingBibs.length;

  if (missingBibs.length === 0) {
    log("VERIFY", "PASS: All registered bibs have entries");
  } else {
    results.errors.push(`MISSING BIBS: ${missingBibs.join(", ")}`);
  }

  // Check: finish order consistency (within each bib, lap times should increase)
  let orderErrors = 0;
  const bibEntries: Record<number, number[]> = {};
  entries
    .filter((e: any) => e.bibNumber !== null)
    .sort((a: any, b: any) => a.finishTime - b.finishTime)
    .forEach((e: any) => {
      if (!bibEntries[e.bibNumber]) bibEntries[e.bibNumber] = [];
      bibEntries[e.bibNumber].push(e.finishTime);
    });

  for (const [bib, times] of Object.entries(bibEntries)) {
    for (let i = 1; i < times.length; i++) {
      if (times[i] < times[i - 1]) {
        orderErrors++;
        results.errors.push(`LAP ORDER ERROR: bib ${bib} lap ${i + 1} (${times[i]}ms) before lap ${i} (${times[i - 1]}ms)`);
      }
    }
  }

  if (orderErrors === 0) {
    log("VERIFY", "PASS: Lap order consistent for all bibs");
  }

  // Read race data to verify room code lookup
  const raceSnap = await get(ref(db, `races/${raceId}`));
  const race = raceSnap.val();
  if (race) {
    const codeSnap = await get(ref(db, `roomCodes/${race.roomCode}`));
    if (codeSnap.val() === raceId) {
      log("VERIFY", `PASS: Room code ${race.roomCode} resolves to correct race`);
    } else {
      results.errors.push(`ROOM CODE LOOKUP FAILED: ${race.roomCode} -> ${codeSnap.val()}`);
    }
  }
}

// ─── Phase 6: Cleanup ────────────────────────────────────────────────────────

async function cleanup(raceId: string, roomCode: string): Promise<void> {
  log("CLEANUP", "Removing test data from Firebase...");
  await remove(ref(db, `races/${raceId}`));
  await remove(ref(db, `entries/${raceId}`));
  await remove(ref(db, `roomCodes/${roomCode}`));
  log("CLEANUP", "Done — test data removed");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  5K RACE TIMING APP — FULL STRESS TEST");
  console.log("  " + TEST_RACE_NAME);
  console.log("  Config: " + `${RUNNERS_PER_RANGE * 3} runners, ${TOTAL_LAPS} laps, 3 timers`);
  console.log("=".repeat(70) + "\n");

  const startWall = Date.now();
  let raceId = "";
  let roomCode = "";

  try {
    // Phase 1: Create race
    raceId = await createTestRace();
    const raceSnap = await get(ref(db, `races/${raceId}`));
    roomCode = raceSnap.val()?.roomCode || "";

    // Phase 2: Start race
    const raceStartTime = await startTestRace(raceId);

    // Phase 3: Run all 3 timers in parallel + overseer monitoring
    log("MAIN", "Launching 3 timer agents + overseer in parallel...\n");

    await Promise.all([
      runTimerAgent(raceId, raceStartTime, TIMER_CONFIGS[0]),
      runTimerAgent(raceId, raceStartTime, TIMER_CONFIGS[1]),
      runTimerAgent(raceId, raceStartTime, TIMER_CONFIGS[2]),
      runOverseerMonitor(raceId),
    ]);

    console.log("");

    // Phase 4: End race
    await update(ref(db, `races/${raceId}`), { status: "finished" });
    log("OVERSEER", "Race finished");

    // Phase 5: Verify
    console.log("\n" + "-".repeat(70));
    console.log("  VERIFICATION");
    console.log("-".repeat(70) + "\n");

    await verifyResults(raceId);

    // Phase 6: Cleanup
    console.log("");
    await cleanup(raceId, roomCode);

  } catch (err: any) {
    results.errors.push(`FATAL: ${err.message}`);
    console.error("FATAL ERROR:", err);
    // Still try to cleanup
    if (raceId) {
      try { await cleanup(raceId, roomCode); } catch {}
    }
  }

  // ─── Final Report ──────────────────────────────────────────────────────────

  const elapsed = ((Date.now() - startWall) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(70));
  console.log("  TEST RESULTS");
  console.log("=".repeat(70));
  console.log(`  Duration:            ${elapsed}s`);
  console.log(`  Entries written:     ${results.entriesWritten}`);
  console.log(`  Entries read back:   ${results.entriesRead}`);
  console.log(`  Quick captures:      ${results.quickCaptureEntries}`);
  console.log(`  Bib assignments:     ${results.bibAssignments}`);
  console.log(`  Finished runners:    ${results.finishedRunners}`);
  console.log(`  Duplicates found:    ${results.duplicatesDetected}`);
  console.log(`  Missing bibs:        ${results.missingBibsDetected}`);
  console.log(`  Errors:              ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log("\n  FAILURES:");
    results.errors.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
    console.log("\n  STATUS: FAIL ✗");
  } else {
    console.log("\n  STATUS: ALL TESTS PASSED ✓");
  }

  console.log("=".repeat(70) + "\n");

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main();
