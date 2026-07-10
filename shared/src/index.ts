export type WorkerStatus = "waiting" | "loading" | "success" | "error";

export interface WorkerSnapshot {
  id: number;
  status: WorkerStatus;
  isActive: boolean;
  httpStatus?: number;
  statusText?: string;
  responseTimeMs?: number;
  lastCheckedAt?: string;
  progress: number;
  ipAddress?: string;
  proxyStatus?: "direct" | "proxy";
  trafficSource?: "direct" | "instagram" | "whatsapp";
}

export interface MonitorStats {
  configuredUrl: string;
  isRunning: boolean;
  totalVirtualUsers: number;
  activeUsers: number;
  successfulRequests: number;
  failedRequests: number;
  totalRequests: number;
  averageResponseTimeMs: number;
  requestsPerSecond: number;
  uptimePercentage: number;
  startedAt?: string;
  intervalMs: number;
  bouncerCount: number;
  scrollerCount: number;
  watcherCount: number;
  videoDurationSec: number;
  instagramCount: number;
  whatsappCount: number;
  region: string;
}

export interface ActivityLog {
  id: number;
  workerId: number;
  url: string;
  status: WorkerStatus;
  httpStatus?: number;
  statusText?: string;
  responseTimeMs?: number;
  message: string;
  createdAt: string;
  ipAddress?: string;
}

export interface StartMonitorRequest {
  url: string;
  workerCount: number;
  intervalMs: number;
  region?: string;
}

export interface StartMonitorResponse {
  stats: MonitorStats;
  workers: WorkerSnapshot[];
}

export interface ChartPoint {
  timestamp: string;
  averageResponseTimeMs: number;
  requestsPerSecond: number;
  activeUsers: number;
  successfulRequests: number;
  failedRequests: number;
}
