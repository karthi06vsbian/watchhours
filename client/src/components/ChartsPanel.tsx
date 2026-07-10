import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import type { ChartPoint } from "@monitor/shared";
import { GlassCard } from "./GlassCard";

interface ChartsPanelProps {
  history: ChartPoint[];
}

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#cbd5e1" } }
  },
  scales: {
    x: { ticks: { color: "#94a3b8", maxTicksLimit: 8 }, grid: { color: "rgba(148, 163, 184, 0.12)" } },
    y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148, 163, 184, 0.12)" } }
  }
};

export function ChartsPanel({ history }: ChartsPanelProps) {
  const labels = history.map((point) => new Date(point.timestamp).toLocaleTimeString());
  const responseData: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Avg response time",
        data: history.map((point) => point.averageResponseTimeMs),
        borderColor: "#23c9ff",
        backgroundColor: "rgba(35, 201, 255, 0.14)",
        tension: 0.35,
        fill: true
      },
      {
        label: "Requests / sec",
        data: history.map((point) => point.requestsPerSecond),
        borderColor: "#35ff9f",
        backgroundColor: "rgba(53, 255, 159, 0.12)",
        tension: 0.35,
        fill: true
      }
    ]
  };

  const workersData: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Active workers",
        data: history.map((point) => point.activeUsers),
        borderColor: "#ffd166",
        backgroundColor: "rgba(255, 209, 102, 0.16)",
        tension: 0.35,
        fill: true
      }
    ]
  };

  const successData: ChartData<"bar"> = {
    labels: ["Success", "Failure"],
    datasets: [
      {
        label: "Requests",
        data: [
          history.at(-1)?.successfulRequests ?? 0,
          history.at(-1)?.failedRequests ?? 0
        ],
        backgroundColor: ["rgba(53, 255, 159, 0.72)", "rgba(255, 71, 111, 0.72)"],
        borderColor: ["#35ff9f", "#ff476f"],
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <GlassCard className="h-72 xl:col-span-2">
        <h2 className="panel-title">Response & Throughput</h2>
        <div className="h-56">
          <Line data={responseData} options={options} />
        </div>
      </GlassCard>
      <GlassCard className="h-72">
        <h2 className="panel-title">Success vs Failure</h2>
        <div className="h-56">
          <Bar data={successData} options={options as ChartOptions<"bar">} />
        </div>
      </GlassCard>
      <GlassCard className="h-72 xl:col-span-3">
        <h2 className="panel-title">Active Workers</h2>
        <div className="h-56">
          <Line data={workersData} options={options} />
        </div>
      </GlassCard>
    </div>
  );
}
