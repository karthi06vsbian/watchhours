import type { StartMonitorRequest } from "@monitor/shared";
import type { LogsResponse, StatsResponse, WorkersResponse } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

function apiPath(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiPath(path), {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(body.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  start: (payload: StartMonitorRequest) =>
    request<StatsResponse & WorkersResponse>("/start", { method: "POST", body: JSON.stringify(payload) }),
  stop: () => request<StatsResponse & WorkersResponse>("/stop", { method: "POST" }),
  reset: () => request<StatsResponse & WorkersResponse & LogsResponse>("/reset", { method: "POST" }),
  rotateIPs: () => request<StatsResponse & WorkersResponse>("/rotate-ips", { method: "POST" }),
  stats: () => request<StatsResponse>("/stats"),
  logs: () => request<LogsResponse>("/logs?limit=500"),
  workers: () => request<WorkersResponse>("/workers"),
  openBrowser: (workerId: number, url: string) =>
    request<{ success: boolean }>("/open-browser", {
      method: "POST",
      body: JSON.stringify({ workerId, url })
    })
};
