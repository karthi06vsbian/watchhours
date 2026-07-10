import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { WorkerSnapshot, WorkerStatus } from "@monitor/shared";
import { GlassCard } from "./GlassCard";
import { api } from "../api";

interface UserGridProps {
  workers: WorkerSnapshot[];
  targetUrl: string;
  isRunning: boolean;
  workerCount: number;
}

const statusStyles: Record<WorkerStatus, string> = {
  success: "border-neonGreen/60 bg-neonGreen/10 text-neonGreen",
  loading: "border-signalYellow/60 bg-signalYellow/10 text-signalYellow",
  error: "border-alertRed/60 bg-alertRed/10 text-alertRed",
  waiting: "border-slate-500/40 bg-slate-500/10 text-slate-300"
};

function getVideoEmbedInfo(urlStr: string): { embedUrl: string; isDirectVideo: boolean; platformName: string } {
  if (!urlStr) {
    return { embedUrl: "", isDirectVideo: false, platformName: "None" };
  }

  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // 1. Direct Video files (mp4, webm, ogg, ogv, mov)
    if (
      pathname.endsWith(".mp4") ||
      pathname.endsWith(".webm") ||
      pathname.endsWith(".ogg") ||
      pathname.endsWith(".ogv") ||
      pathname.endsWith(".mov")
    ) {
      return { embedUrl: urlStr, isDirectVideo: true, platformName: "HTML5 Video API" };
    }

    // 2. YouTube
    if (
      hostname.includes("youtube.com") ||
      hostname.includes("youtu.be") ||
      hostname.includes("youtube-nocookie.com")
    ) {
      let videoId = "";
      if (hostname.includes("youtu.be")) {
        videoId = url.pathname.slice(1);
      } else if (url.pathname.includes("/embed/")) {
        return { embedUrl: urlStr, isDirectVideo: false, platformName: "YouTube API" };
      } else if (url.pathname.includes("/shorts/")) {
        videoId = url.pathname.split("/shorts/")[1]?.split("/")[0] ?? "";
      } else if (url.pathname.includes("/v/")) {
        videoId = url.pathname.split("/v/")[1]?.split("/")[0] ?? "";
      } else {
        videoId = url.searchParams.get("v") ?? "";
      }

      if (videoId) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1`,
          isDirectVideo: false,
          platformName: "YouTube API"
        };
      }
    }

    // 3. Vimeo
    if (hostname.includes("vimeo.com")) {
      if (hostname.includes("player.vimeo.com")) {
        return { embedUrl: urlStr, isDirectVideo: false, platformName: "Vimeo Player" };
      }
      const match = url.pathname.match(/(?:channels\/\w+\/|groups\/\w+\/videos\/|\/)?(\d+)/);
      if (match && match[1]) {
        return {
          embedUrl: `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1`,
          isDirectVideo: false,
          platformName: "Vimeo Player"
        };
      }
    }

    // 4. DailyMotion
    if (hostname.includes("dailymotion.com") || hostname.includes("dai.ly")) {
      if (hostname.includes("dai.ly")) {
        const videoId = url.pathname.slice(1);
        if (videoId) {
          return {
            embedUrl: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1`,
            isDirectVideo: false,
            platformName: "Dailymotion Embed"
          };
        }
      } else if (url.pathname.includes("/embed/")) {
        return { embedUrl: urlStr, isDirectVideo: false, platformName: "Dailymotion Embed" };
      } else {
        const match = url.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          return {
            embedUrl: `https://www.dailymotion.com/embed/video/${match[1]}?autoplay=1&mute=1`,
            isDirectVideo: false,
            platformName: "Dailymotion Embed"
          };
        }
      }
    }

    // 5. Twitch
    if (hostname.includes("twitch.tv")) {
      const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
      if (url.pathname.includes("/videos/")) {
        const videoId = url.pathname.split("/videos/")[1]?.split("/")[0];
        if (videoId) {
          return {
            embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${parent}&autoplay=true&muted=true`,
            isDirectVideo: false,
            platformName: "Twitch Player"
          };
        }
      } else {
        const channelName = url.pathname.slice(1).split("/")[0];
        if (channelName) {
          return {
            embedUrl: `https://player.twitch.tv/?channel=${channelName}&parent=${parent}&autoplay=true&muted=true`,
            isDirectVideo: false,
            platformName: "Twitch Player"
          };
        }
      }
    }

    // 6. TikTok
    if (hostname.includes("tiktok.com")) {
      const match = url.pathname.match(/\/video\/(\d+)/);
      if (match && match[1]) {
        return {
          embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
          isDirectVideo: false,
          platformName: "TikTok Embed"
        };
      }
    }
  } catch (e) {
    // ignore
  }

  return { embedUrl: urlStr, isDirectVideo: false, platformName: "Web Frame" };
}

export function UserGrid({ workers, targetUrl, isRunning, workerCount }: UserGridProps) {
  const hasTargetUrl = targetUrl.length > 0;
  const embedInfo = getVideoEmbedInfo(targetUrl);
  const visibleWorkers = workers.slice(0, workerCount);

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="panel-title">Virtual User Grid</h2>
        <span className="font-mono text-xs text-slate-400">{visibleWorkers.length} mini browsers</span>
      </div>
      <div className="grid max-h-[680px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visibleWorkers.map((worker) => {
          const canOpenTarget = hasTargetUrl;

          return (
            <motion.article
              key={worker.id}
              layout
              className={`rounded-lg border p-3 ${statusStyles[worker.status]}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
            >
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-sm font-semibold">User {worker.id}</div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] uppercase">
                  {worker.status}
                </div>
                <button
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-current/30 transition hover:bg-white/10 ${
                    canOpenTarget ? "" : "pointer-events-none opacity-40"
                  }`}
                  onClick={() => {
                    if (canOpenTarget) {
                      api.openBrowser(worker.id, targetUrl).catch((err) => {
                        console.error("Failed to trigger proxy browser launch:", err);
                      });
                    }
                  }}
                  title="Open proxy-routed browser window"
                  disabled={!canOpenTarget}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-3 aspect-video overflow-hidden rounded-md border border-current/20 bg-slate-950/60">
              {canOpenTarget ? (
                embedInfo.isDirectVideo ? (
                  <video
                    className="h-full w-full bg-black object-contain"
                    src={embedInfo.embedUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <iframe
                    className="h-full w-full bg-white border-0"
                    src={embedInfo.embedUrl}
                    title={`Target preview for user ${worker.id}`}
                    loading="lazy"
                    sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-presentation"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center font-mono text-[10px] uppercase tracking-wide text-slate-500">
                  Waiting for target
                </div>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div>
                <dt className="text-slate-500">IP Address</dt>
                <dd className="truncate font-mono text-slate-100 text-[11px]" title={worker.ipAddress ?? "Not assigned"}>
                  {worker.ipAddress ?? "--"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Source</dt>
                <dd className="font-mono text-slate-100 text-[10px] uppercase">
                  {worker.trafficSource === "instagram" ? (
                    <span className="text-pink-400 font-medium">Instagram</span>
                  ) : worker.trafficSource === "whatsapp" ? (
                    <span className="text-neonGreen font-medium">WhatsApp</span>
                  ) : (
                    <span className="text-slate-400">Direct</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Route</dt>
                <dd className="font-mono text-slate-100 text-[10px] uppercase">
                  {worker.proxyStatus === "proxy" ? (
                    <span className="text-neonGreen">Proxy</span>
                  ) : (
                    <span className="text-slate-400">Direct</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">HTTP</dt>
                <dd className="font-mono text-slate-100">{worker.httpStatus ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Time</dt>
                <dd className="font-mono text-slate-100">{worker.responseTimeMs ? `${worker.responseTimeMs} ms` : "--"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">API Source</dt>
                <dd className="truncate font-mono text-slate-100 text-[10px]" title={canOpenTarget ? embedInfo.platformName : "None"}>
                  {canOpenTarget ? embedInfo.platformName : "--"}
                </dd>
              </div>
            </dl>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-current"
                animate={{ width: `${worker.status === "loading" ? 100 : worker.progress}%` }}
                transition={{ duration: worker.status === "loading" ? 1 : 0.25 }}
              />
            </div>
            </motion.article>
          );
        })}
      </div>
    </GlassCard>
  );
}
