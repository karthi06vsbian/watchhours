import type { ActivityLog, WorkerStatus } from "@monitor/shared";
import { GlassCard } from "./GlassCard";

interface LogsPanelProps {
  logs: ActivityLog[];
  search: string;
  statusFilter: "all" | WorkerStatus;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: "all" | WorkerStatus) => void;
}

const statuses: Array<"all" | WorkerStatus> = ["all", "success", "error", "loading", "waiting"];

export function LogsPanel({ logs, search, statusFilter, onSearchChange, onStatusFilterChange }: LogsPanelProps) {
  const filteredLogs = logs.filter((log) => {
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesSearch = `${log.message} ${log.url}`.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <GlassCard>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="panel-title">Activity Logs</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field h-10 min-w-60"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search logs"
          />
          <select
            className="field h-10"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as "all" | WorkerStatus)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="max-h-96 space-y-2 overflow-y-auto pr-1 font-mono text-sm">
        {filteredLogs.length ? filteredLogs.map((log) => (
          <div key={log.id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-slate-200">
            <span className="text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
            <span className="mx-2 text-slate-600">|</span>
            <span>{log.message}</span>
          </div>
        )) : (
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-8 text-center text-slate-400">
            No logs yet.
          </div>
        )}
      </div>
    </GlassCard>
  );
}
