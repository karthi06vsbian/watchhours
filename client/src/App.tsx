import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Radio, ShieldCheck, Timer, Users, Wifi, WifiOff, Clock, CornerUpLeft, Tv, Scroll, Instagram, MessageCircle } from "lucide-react";
import type { ActivityLog, ChartPoint, MonitorStats, WorkerSnapshot, WorkerStatus } from "@monitor/shared";
import { api } from "./api";
import { ChartsPanel } from "./components/ChartsPanel";
import { ControlPanel } from "./components/ControlPanel";
import { LogsPanel } from "./components/LogsPanel";
import { StatCard } from "./components/StatCard";
import { UserGrid } from "./components/UserGrid";
import { exportLogsCsv, exportStatsPdf } from "./utils/export";

const initialStats: MonitorStats = {
  configuredUrl: "",
  isRunning: false,
  totalVirtualUsers: 100,
  activeUsers: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalRequests: 0,
  averageResponseTimeMs: 0,
  requestsPerSecond: 0,
  uptimePercentage: 100,
  intervalMs: 5000,
  bouncerCount: 0,
  scrollerCount: 0,
  watcherCount: 0,
  videoDurationSec: 0,
  instagramCount: 0,
  whatsappCount: 0,
  region: "all"
};

const initialWorkers: WorkerSnapshot[] = Array.from({ length: 1000 }, (_, index) => ({
  id: index + 1,
  status: "waiting",
  isActive: false,
  progress: 0
}));

export function App() {
  const [url, setUrl] = useState("https://example.com");
  const [workerCount, setWorkerCount] = useState(20);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [region, setRegion] = useState("all");
  const [stats, setStats] = useState<MonitorStats>(initialStats);
  const [workers, setWorkers] = useState<WorkerSnapshot[]>(initialWorkers);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkerStatus>("all");
  const [error, setError] = useState<string>();
  const [isDark, setIsDark] = useState(true);
  const [connectionError, setConnectionError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const [statsResponse, logsResponse, workersResponse] = await Promise.all([
        api.stats(),
        api.logs(),
        api.workers()
      ]);
      setStats(statsResponse.stats);
      setHistory(statsResponse.chartHistory);
      setLogs(logsResponse.logs);
      setWorkers(workersResponse.workers);
      setConnectionError(undefined);
    } catch (err) {
      setConnectionError(
        err instanceof Error ? err.message : "Failed to connect to the backend server API."
      );
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const timer = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !isDark);
  }, [isDark]);

  const start = async () => {
    setError(undefined);
    try {
      const response = await api.start({ url, workerCount, intervalMs, region });
      setStats(response.stats);
      setWorkers(response.workers);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start monitor.");
    }
  };

  const stop = async () => {
    const response = await api.stop();
    setStats(response.stats);
    setWorkers(response.workers);
  };

  const reset = async () => {
    const response = await api.reset();
    setStats(response.stats);
    setWorkers(response.workers);
    setLogs(response.logs);
    setHistory([]);
    setError(undefined);
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "Not detected";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const statCards = useMemo(() => [
    { label: "Total users", value: stats.totalVirtualUsers, accent: "blue" as const, icon: Users },
    { label: "Active", value: stats.activeUsers, accent: "green" as const, icon: Radio },
    { label: "Success", value: stats.successfulRequests, accent: "green" as const, icon: Wifi },
    { label: "Failed", value: stats.failedRequests, accent: "red" as const, icon: WifiOff },
    { label: "Instagram Views", value: stats.instagramCount, accent: "red" as const, icon: Instagram },
    { label: "WhatsApp Views", value: stats.whatsappCount, accent: "green" as const, icon: MessageCircle },
    { label: "Full Watched", value: stats.watcherCount, accent: "green" as const, icon: Tv },
    { label: "Scrolled View", value: stats.scrollerCount, accent: "yellow" as const, icon: Scroll },
    { label: "Bounced / Skipped", value: stats.bouncerCount, accent: "red" as const, icon: CornerUpLeft },
    { label: "Video Duration", value: formatDuration(stats.videoDurationSec), accent: "blue" as const, icon: Clock },
    { label: "Avg response", value: `${stats.averageResponseTimeMs} ms`, accent: "blue" as const, icon: Timer },
    { label: "Req / sec", value: stats.requestsPerSecond, accent: "yellow" as const, icon: Activity },
    { label: "Uptime", value: `${stats.uptimePercentage}%`, accent: "green" as const, icon: ShieldCheck },
    { label: "Interval", value: `${stats.intervalMs} ms`, accent: "blue" as const, icon: Gauge }
  ], [stats]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-void text-slate-100 transition-colors">
      <div className="scanline pointer-events-none fixed inset-0 opacity-30" />
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-neonGreen">Educational monitoring lab</p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Website Monitor Simulator</h1>
          </div>
          <div className="rounded-lg border border-neonBlue/30 bg-neonBlue/10 px-4 py-3 text-sm text-cyan-100">
            Authorized targets only. No IP rotation, proxy evasion, or rate-limit bypassing.
          </div>
        </header>

        {connectionError && (
          <div className="mb-4 rounded-lg border border-alertRed/40 bg-alertRed/10 px-4 py-3 text-sm text-red-100">
            <span className="font-bold text-alertRed">API Connection Error:</span> {connectionError}
            <div className="mt-1 text-xs text-slate-400">
              Please check that your backend server is active and the environment variable <code>VITE_API_BASE_URL</code> is pointing to the correct backend endpoint (e.g. <code>https://your-backend.onrender.com</code>).
            </div>
          </div>
        )}

        <ControlPanel
          url={url}
          workerCount={workerCount}
          intervalMs={intervalMs}
          region={region}
          isRunning={stats.isRunning}
          isDark={isDark}
          error={error}
          onUrlChange={setUrl}
          onWorkerCountChange={(value) => setWorkerCount(Math.min(Math.max(value, 1), 1000))}
          onIntervalChange={setIntervalMs}
          onRegionChange={setRegion}
          onStart={start}
          onStop={stop}
          onReset={reset}
          onExportCsv={() => exportLogsCsv(logs)}
          onExportPdf={() => exportStatsPdf(stats)}
          onToggleTheme={() => setIsDark((value) => !value)}
        />

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        <section className="mt-4 grid gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <ChartsPanel history={history} />
            <LogsPanel
              logs={logs}
              search={search}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
            />
          </div>
          <UserGrid workers={workers} targetUrl={stats.configuredUrl || url} isRunning={stats.isRunning} workerCount={workerCount} />
        </section>
      </div>
    </main>
  );
}
