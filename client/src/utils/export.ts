import jsPDF from "jspdf";
import type { ActivityLog, MonitorStats } from "@monitor/shared";

export function exportLogsCsv(logs: ActivityLog[]): void {
  const header = ["id", "workerId", "ipAddress", "status", "httpStatus", "responseTimeMs", "message", "createdAt"];
  const rows = logs.map((log) => [
    log.id,
    log.workerId,
    log.ipAddress ?? "",
    log.status,
    log.httpStatus ?? "",
    log.responseTimeMs ?? "",
    log.message,
    log.createdAt
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  downloadBlob(csv, "monitor-logs.csv", "text/csv;charset=utf-8");
}

export function exportStatsPdf(stats: MonitorStats): void {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Website Monitor Simulator Statistics", 16, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines = [
    ["URL", stats.configuredUrl || "Not configured"],
    ["Running", stats.isRunning ? "Yes" : "No"],
    ["Active users", String(stats.activeUsers)],
    ["Successful requests", String(stats.successfulRequests)],
    ["Failed requests", String(stats.failedRequests)],
    ["Average response time", `${stats.averageResponseTimeMs} ms`],
    ["Requests per second", String(stats.requestsPerSecond)],
    ["Uptime", `${stats.uptimePercentage}%`],
    ["Interval", `${stats.intervalMs} ms`],
    ["Generated", new Date().toLocaleString()]
  ];

  lines.forEach(([label, value], index) => {
    const y = 38 + index * 9;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, y, { maxWidth: 120 });
  });

  doc.save("monitor-statistics.pdf");
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
