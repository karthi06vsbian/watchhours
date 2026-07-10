import { Download, FileDown, Moon, Play, RefreshCcw, Square, Sun } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface ControlPanelProps {
  url: string;
  workerCount: number;
  intervalMs: number;
  region: string;
  isRunning: boolean;
  isDark: boolean;
  error?: string;
  onUrlChange: (value: string) => void;
  onWorkerCountChange: (value: number) => void;
  onIntervalChange: (value: number) => void;
  onRegionChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onToggleTheme: () => void;
}

export function ControlPanel(props: ControlPanelProps) {
  return (
    <GlassCard className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <label className="flex-1">
          <span className="field-label">Target URL</span>
          <input
            className="field"
            value={props.url}
            onChange={(event) => props.onUrlChange(event.target.value)}
            placeholder="https://example.com"
            disabled={props.isRunning}
          />
        </label>

        <label className="min-w-48">
          <span className="field-label">Region</span>
          <select
            className="field bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-slate-100 focus:outline-none"
            value={props.region}
            onChange={(event) => props.onRegionChange(event.target.value)}
            disabled={props.isRunning}
          >
            <option value="all">Worldwide</option>
            <option value="in">India</option>
            <option value="us">United States</option>
            <option value="tn">Tamil Nadu (India)</option>
          </select>
        </label>

        <label className="min-w-48">
          <span className="field-label">Virtual users</span>
          <input
            className="field"
            type="number"
            min={1}
            max={1000}
            value={props.workerCount}
            onChange={(event) => props.onWorkerCountChange(Number(event.target.value))}
            disabled={props.isRunning}
          />
        </label>
      </div>

      {props.error ? <div className="rounded-md border border-alertRed/40 bg-alertRed/10 px-3 py-2 text-sm text-red-100">{props.error}</div> : null}

      <div className="flex flex-wrap gap-2">
        <button className="action primary" onClick={props.onStart} disabled={props.isRunning} title="Start monitoring">
          <Play className="h-4 w-4" />
          Start
        </button>
        <button className="action danger" onClick={props.onStop} disabled={!props.isRunning} title="Stop monitoring">
          <Square className="h-4 w-4" />
          Stop
        </button>
        <button className="action" onClick={props.onReset} title="Reset monitoring">
          <RefreshCcw className="h-4 w-4" />
          Reset
        </button>
        <button className="action" onClick={props.onExportCsv} title="Export logs to CSV">
          <Download className="h-4 w-4" />
          CSV
        </button>
        <button className="action" onClick={props.onExportPdf} title="Export statistics to PDF">
          <FileDown className="h-4 w-4" />
          PDF
        </button>
        <button className="icon-action ml-auto" onClick={props.onToggleTheme} title="Toggle theme">
          {props.isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </GlassCard>
  );
}
