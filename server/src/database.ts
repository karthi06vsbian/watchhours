import fs from "node:fs";
import path from "node:path";
import type { ActivityLog } from "@monitor/shared";

interface LogStore {
  nextId: number;
  logs: ActivityLog[];
}

const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "server", "data", "monitor-logs.json");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

let store = readStore();

function readStore(): LogStore {
  try {
    const parsed = JSON.parse(fs.readFileSync(databasePath, "utf8")) as Partial<LogStore>;
    if (Array.isArray(parsed.logs) && typeof parsed.nextId === "number") {
      return { nextId: parsed.nextId, logs: parsed.logs };
    }
  } catch {
    // Missing or invalid stores are recreated on first write.
  }

  return { nextId: 1, logs: [] };
}

function writeStore(): void {
  fs.writeFileSync(databasePath, JSON.stringify(store, null, 2));
}

export function insertLog(log: Omit<ActivityLog, "id">): ActivityLog {
  const entry = { id: store.nextId, ...log };
  store = {
    nextId: store.nextId + 1,
    logs: [entry, ...store.logs].slice(0, 5000)
  };
  writeStore();
  return entry;
}

export function listLogs(limit = 300): ActivityLog[] {
  return store.logs.slice(0, Math.min(Math.max(limit, 1), 1000));
}

export function clearLogs(): void {
  store = { nextId: 1, logs: [] };
  writeStore();
}
