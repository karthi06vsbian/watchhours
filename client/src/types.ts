import type { ActivityLog, ChartPoint, MonitorStats, WorkerSnapshot } from "@monitor/shared";

export interface StatsResponse {
  stats: MonitorStats;
  chartHistory: ChartPoint[];
}

export interface LogsResponse {
  logs: ActivityLog[];
}

export interface WorkersResponse {
  workers: WorkerSnapshot[];
}
