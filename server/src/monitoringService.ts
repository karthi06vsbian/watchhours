import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer";
import type {
  ActivityLog,
  ChartPoint,
  MonitorStats,
  StartMonitorRequest,
  WorkerSnapshot
} from "@monitor/shared";
import { clearLogs, insertLog, listLogs } from "./database.js";

const PROXIES_FILE = path.join(process.cwd(), "server", "data", "proxies.txt");

class PuppeteerQueue {
  private activeCount = 0;
  private maxConcurrency = 5;
  private queue: (() => void)[] = [];

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount += 1;
    try {
      return await fn();
    } finally {
      this.activeCount -= 1;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

const browserQueue = new PuppeteerQueue();

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0"
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1600, height: 900 }
];

const LOCALES = [
  { locale: "en-US", timezone: "America/New_York", languages: ["en-US", "en"] },
  { locale: "en-GB", timezone: "Europe/London", languages: ["en-GB", "en"] },
  { locale: "de-DE", timezone: "Europe/Berlin", languages: ["de-DE", "de", "en"] },
  { locale: "fr-FR", timezone: "Europe/Paris", languages: ["fr-FR", "fr", "en"] },
  { locale: "ja-JP", timezone: "Asia/Tokyo", languages: ["ja-JP", "ja", "en"] },
  { locale: "es-ES", timezone: "Europe/Madrid", languages: ["es-ES", "es", "en"] },
  { locale: "zh-CN", timezone: "Asia/Shanghai", languages: ["zh-CN", "zh", "en"] }
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomViewport() {
  return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

function getRandomLocale() {
  return LOCALES[Math.floor(Math.random() * LOCALES.length)];
}

function loadProxies(): string[] {
  try {
    fs.mkdirSync(path.dirname(PROXIES_FILE), { recursive: true });
    if (!fs.existsSync(PROXIES_FILE)) {
      fs.writeFileSync(
        PROXIES_FILE,
        "# Enter HTTP/HTTPS proxies, one per line. E.g.:\n# http://12.34.56.78:8080\n# http://user:pass@12.34.56.78:8080\n",
        "utf8"
      );
      return [];
    }
    const lines = fs.readFileSync(PROXIES_FILE, "utf8").split("\n");
    return lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function generateRandomIP(): string {
  const o1 = Math.floor(Math.random() * 223) + 1;
  const o2 = Math.floor(Math.random() * 256);
  const o3 = Math.floor(Math.random() * 256);
  const o4 = Math.floor(Math.random() * 256);
  if (o1 === 10 || o1 === 127 || (o1 === 192 && o2 === 168) || (o1 === 172 && o2 >= 16 && o2 <= 31)) {
    return generateRandomIP();
  }
  return `${o1}.${o2}.${o3}.${o4}`;
}

function generateRegionIP(region = "all"): string {
  if (region === "us") {
    const blocks = [
      { prefix: [67], min2: 0, max2: 255 },
      { prefix: [72], min2: 0, max2: 255 },
      { prefix: [98], min2: 0, max2: 255 },
      { prefix: [172], min2: 56, max2: 59 }
    ];
    const block = blocks[Math.floor(Math.random() * blocks.length)];
    const o1 = block.prefix[0];
    const o2 = Math.floor(Math.random() * (block.max2 - block.min2 + 1)) + block.min2;
    const o3 = Math.floor(Math.random() * 256);
    const o4 = Math.floor(Math.random() * 256);
    return `${o1}.${o2}.${o3}.${o4}`;
  } else if (region === "in") {
    const blocks = [
      { prefix: [49], min2: 32, max2: 47 },
      { prefix: [103], min2: 241, max2: 241 },
      { prefix: [117], min2: 192, max2: 255 },
      { prefix: [157], min2: 32, max2: 63 }
    ];
    const block = blocks[Math.floor(Math.random() * blocks.length)];
    const o1 = block.prefix[0];
    const o2 = Math.floor(Math.random() * (block.max2 - block.min2 + 1)) + block.min2;
    const o3 = Math.floor(Math.random() * 256);
    const o4 = Math.floor(Math.random() * 256);
    return `${o1}.${o2}.${o3}.${o4}`;
  } else if (region === "tn") {
    const blocks = [
      { prefix: [49], min2: 37, max2: 37 },
      { prefix: [103], min2: 77, max2: 77 },
      { prefix: [117], min2: 253, max2: 253 },
      { prefix: [157], min2: 44, max2: 44 }
    ];
    const block = blocks[Math.floor(Math.random() * blocks.length)];
    const o1 = block.prefix[0];
    const o2 = Math.floor(Math.random() * (block.max2 - block.min2 + 1)) + block.min2;
    const o3 = Math.floor(Math.random() * 256);
    const o4 = Math.floor(Math.random() * 256);
    return `${o1}.${o2}.${o3}.${o4}`;
  }
  return generateRandomIP();
}

const MAX_WORKERS = 1000;
const MIN_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 10_000;

type WorkerRuntime = WorkerSnapshot & {
  timer?: NodeJS.Timeout;
  inFlight: boolean;
};

class MonitoringService {
  private configuredUrl = "";
  private workers: WorkerRuntime[] = this.createWorkers(MAX_WORKERS);
  private startedAt?: Date;
  private intervalMs = 5000;
  private successfulRequests = 0;
  private failedRequests = 0;
  private totalResponseTime = 0;
  private requestTimestamps: number[] = [];
  private chartHistory: ChartPoint[] = [];
  private bouncerCount = 0;
  private scrollerCount = 0;
  private watcherCount = 0;
  private videoDurationSec = 0;
  private instagramCount = 0;
  private whatsappCount = 0;
  private currentRegion = "all";

  start(input: StartMonitorRequest): { stats: MonitorStats; workers: WorkerSnapshot[] } {
    const url = this.validateUrl(input.url);
    const workerCount = this.clamp(input.workerCount, 1, MAX_WORKERS);
    const intervalMs = this.clamp(input.intervalMs, MIN_INTERVAL_MS, 60_000);
    const region = input.region || "all";

    this.stop();
    this.configuredUrl = url;
    this.intervalMs = intervalMs;
    this.currentRegion = region;
    this.startedAt = new Date();
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.totalResponseTime = 0;
    this.requestTimestamps = [];
    this.chartHistory = [];
    this.bouncerCount = 0;
    this.scrollerCount = 0;
    this.watcherCount = 0;
    this.videoDurationSec = 0;
    this.instagramCount = 0;
    this.whatsappCount = 0;
    this.workers = this.createWorkers(MAX_WORKERS, region);

    for (let index = 0; index < workerCount; index += 1) {
      const worker = this.workers[index];
      worker.status = "waiting";
      worker.progress = 0;
      const initialDelay = Math.round((intervalMs / workerCount) * index);
      worker.timer = setTimeout(() => {
        void this.tickWorker(worker);
        worker.timer = setInterval(() => void this.tickWorker(worker), intervalMs);
      }, initialDelay);
    }

    this.captureChartPoint();
    return { stats: this.getStats(), workers: this.getWorkers() };
  }

  stop(): MonitorStats {
    this.workers.forEach((worker) => {
      if (worker.timer) {
        clearTimeout(worker.timer);
        clearInterval(worker.timer);
      }
      worker.timer = undefined;
      worker.inFlight = false;
      worker.progress = 0;
      if (worker.status === "loading") {
        worker.status = "waiting";
      }
    });
    this.startedAt = undefined;
    this.captureChartPoint();
    return this.getStats();
  }

  reset(): { stats: MonitorStats; workers: WorkerSnapshot[]; logs: ActivityLog[] } {
    this.stop();
    this.configuredUrl = "";
    this.intervalMs = 5000;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.totalResponseTime = 0;
    this.requestTimestamps = [];
    this.chartHistory = [];
    this.bouncerCount = 0;
    this.scrollerCount = 0;
    this.watcherCount = 0;
    this.videoDurationSec = 0;
    this.instagramCount = 0;
    this.whatsappCount = 0;
    this.workers = this.createWorkers(MAX_WORKERS, "all");
    clearLogs();
    return { stats: this.getStats(), workers: this.getWorkers(), logs: [] };
  }

  getStats(): MonitorStats {
    const totalRequests = this.successfulRequests + this.failedRequests;
    const oneSecondAgo = Date.now() - 1000;
    this.requestTimestamps = this.requestTimestamps.filter((timestamp) => timestamp >= oneSecondAgo);
    const activeUsers = this.workers.filter((worker) => Boolean(worker.timer) || worker.inFlight).length;

    return {
      configuredUrl: this.configuredUrl,
      isRunning: Boolean(this.startedAt),
      totalVirtualUsers: MAX_WORKERS,
      activeUsers,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      totalRequests,
      averageResponseTimeMs: totalRequests ? Math.round(this.totalResponseTime / totalRequests) : 0,
      requestsPerSecond: this.requestTimestamps.length,
      uptimePercentage: totalRequests ? Number(((this.successfulRequests / totalRequests) * 100).toFixed(2)) : 100,
      startedAt: this.startedAt?.toISOString(),
      intervalMs: this.intervalMs,
      bouncerCount: this.bouncerCount,
      scrollerCount: this.scrollerCount,
      watcherCount: this.watcherCount,
      videoDurationSec: this.videoDurationSec,
      instagramCount: this.instagramCount,
      whatsappCount: this.whatsappCount,
      region: this.currentRegion
    };
  }

  getWorkers(): WorkerSnapshot[] {
    const running = Boolean(this.startedAt);
    const now = Date.now();
    return this.workers.map((worker) => ({
      id: worker.id,
      status: worker.status,
      isActive: Boolean(worker.timer) || worker.inFlight,
      httpStatus: worker.httpStatus,
      statusText: worker.statusText,
      responseTimeMs: worker.responseTimeMs,
      lastCheckedAt: worker.lastCheckedAt,
      progress: running && worker.lastCheckedAt
        ? Math.min(100, Math.round(((now - Date.parse(worker.lastCheckedAt)) / this.intervalMs) * 100))
        : worker.progress,
      ipAddress: worker.ipAddress,
      proxyStatus: worker.proxyStatus,
      trafficSource: worker.trafficSource
    }));
  }

  getLogs(limit?: number): ActivityLog[] {
    return listLogs(limit);
  }

  getChartHistory(): ChartPoint[] {
    this.captureChartPoint();
    return this.chartHistory.slice(-120);
  }

  private async tickWorker(worker: WorkerRuntime): Promise<void> {
    if (!this.startedAt || worker.inFlight || !this.configuredUrl) {
      return;
    }

    worker.inFlight = true;
    worker.status = "loading";
    worker.progress = 100;
    const started = performance.now();

    await browserQueue.run(async () => {
      let browser;
      try {
        const proxies = loadProxies();
        const proxyUrl = worker.proxyStatus === "proxy" && proxies.length > 0
          ? proxies[(worker.id - 1) % proxies.length]
          : undefined;

        const args = [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--autoplay-policy=no-user-gesture-required",
          "--mute-audio",
          "--disable-blink-features=AutomationControlled",
          "--disable-webrtc",
          "--disable-features=WebRtcHideLocalIpsWithMdns"
        ];
        if (proxyUrl) {
          args.push(`--proxy-server=${proxyUrl}`);
        }

        const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
        const executablePath = fs.existsSync(systemChromePath)
          ? systemChromePath
          : (process.env.PUPPETEER_EXECUTABLE_PATH || undefined);

        browser = await puppeteer.launch({
          headless: true,
          executablePath,
          args
        });

        const page = await browser.newPage();
        
        // 1. Hide webdriver trace
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });
        });

        // 2. Select and emulate random User-Agent, Viewport, Locale & Timezone
        let userAgent = getRandomUserAgent();
        let referrerUrl: string | undefined;

        const INSTAGRAM_USER_AGENTS = [
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 231.0.0.17.115",
          "Mozilla/5.0 (Linux; Android 11; SM-G998B Build/RP1A.200720.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.105 Mobile Safari/537.36 Instagram 179.0.0.31.132"
        ];
        const WHATSAPP_USER_AGENTS = [
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.22.4.74 W",
          "Mozilla/5.0 (Linux; Android 10; SM-A205F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.138 Mobile Safari/537.36 WhatsApp/2.21.9.15 A"
        ];

        if (worker.trafficSource === "instagram") {
          userAgent = INSTAGRAM_USER_AGENTS[Math.floor(Math.random() * INSTAGRAM_USER_AGENTS.length)];
          referrerUrl = "https://l.instagram.com/";
        } else if (worker.trafficSource === "whatsapp") {
          userAgent = WHATSAPP_USER_AGENTS[Math.floor(Math.random() * WHATSAPP_USER_AGENTS.length)];
          referrerUrl = "https://l.whatsapp.com/";
        }

        const viewport = getRandomViewport();
        let currentMouseX = Math.round(viewport.width / 2);
        let currentMouseY = Math.round(viewport.height / 2);
        const localeInfo = getRandomLocale();

        await page.setUserAgent(userAgent);
        await page.setViewport(viewport);
        
        await page.emulateTimezone(localeInfo.timezone).catch(() => {});
        await page.setExtraHTTPHeaders({
          "Accept-Language": localeInfo.languages.join(",")
        });
        await page.evaluateOnNewDocument((languages) => {
          Object.defineProperty(navigator, 'languages', {
            get: () => languages,
          });
        }, localeInfo.languages);

        await page.setDefaultNavigationTimeout(15000);

        const response = await page.goto(this.configuredUrl, {
          waitUntil: "networkidle2",
          ...(referrerUrl ? { referer: referrerUrl } : {})
        });

        // Try to start/play any videos
        await this.playVideos(page).catch(() => {});

        // Try to detect the video duration across all frames on initial page load if not already set
        if (this.videoDurationSec === 0) {
          for (let attempt = 0; attempt < 5; attempt++) {
            const dur = await this.detectVideoDuration(page).catch(() => 0);
            if (dur > 0) {
              this.videoDurationSec = Math.round(dur);
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // 2. Select simulation profile
        const rand = Math.random();
        let profile: "bouncer" | "scroller" | "watcher";
        if (rand < 0.2) {
          profile = "bouncer"; // 20% bouncers
        } else if (rand < 0.5) {
          profile = "watcher"; // 30% full watchers
        } else {
          profile = "scroller"; // 50% scrollers
        }

        let targetDurationMs = 30000; // default 30s
        const sourceSuffix = worker.trafficSource !== "direct" ? ` via ${worker.trafficSource === "instagram" ? "Instagram" : "WhatsApp"}` : "";

        if (profile === "bouncer") {
          this.bouncerCount += 1;
          // 2, 3, or 10 seconds skip
          const options = [2000, 3000, 10000];
          targetDurationMs = options[Math.floor(Math.random() * options.length)];
          insertLog({
            workerId: worker.id,
            url: this.configuredUrl,
            status: worker.status,
            message: `Simulating 'Bouncer' profile (skipping after ${targetDurationMs / 1000}s)${sourceSuffix}`,
            createdAt: new Date().toISOString(),
            ipAddress: worker.ipAddress
          });
        } else if (profile === "scroller") {
          this.scrollerCount += 1;
          targetDurationMs = 30000 + Math.floor(Math.random() * 30000); // 30s to 60s
          insertLog({
            workerId: worker.id,
            url: this.configuredUrl,
            status: worker.status,
            message: `Simulating 'Scroller' profile (watching for ${Math.round(targetDurationMs / 1000)}s)${sourceSuffix}`,
            createdAt: new Date().toISOString(),
            ipAddress: worker.ipAddress
          });

          // Perform scrolling
          try {
            await page.evaluate(async () => {
              const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
              const scrollHeight = document.body.scrollHeight;
              const viewportHeight = window.innerHeight;
              let currentScroll = 0;
              
              while (currentScroll < scrollHeight - viewportHeight) {
                const rand = Math.random();
                if (rand < 0.12 && currentScroll > 100) {
                  // 12% chance to scroll UP slightly (human adjustment/reread)
                  const scrollUpAmount = Math.min(30 + Math.floor(Math.random() * 40), currentScroll);
                  window.scrollBy(0, -scrollUpAmount);
                  currentScroll -= scrollUpAmount;
                  await delay(1200 + Math.floor(Math.random() * 1000));
                } else if (rand < 0.08) {
                  // 8% chance to pause longer (reading pause)
                  await delay(2500 + Math.floor(Math.random() * 1500));
                } else {
                  // Standard scroll down
                  const amount = Math.min(100 + Math.floor(Math.random() * 120), scrollHeight - viewportHeight - currentScroll);
                  window.scrollBy(0, amount);
                  currentScroll += amount;
                  await delay(600 + Math.floor(Math.random() * 600));
                }
              }
            });
          } catch (e) {
            // ignore
          }

          // Perform human-like mouse movements
          try {
            const width = viewport.width;
            const height = viewport.height;
            let mPos = { x: currentMouseX, y: currentMouseY };
            for (let i = 0; i < 3; i++) {
              const targetX = Math.floor(Math.random() * width);
              const targetY = Math.floor(Math.random() * height);
              mPos = await this.moveMouseHumanlike(page, mPos.x, mPos.y, targetX, targetY);
              await new Promise((resolve) => setTimeout(resolve, 800 + Math.floor(Math.random() * 800)));
            }
            currentMouseX = mPos.x;
            currentMouseY = mPos.y;
          } catch (e) {
            // ignore
          }
        } else {
          // Full watcher
          // Try to detect video duration
          let videoDurationSec = this.videoDurationSec;
          if (videoDurationSec === 0) {
            const dur = await this.detectVideoDuration(page).catch(() => 0);
            if (dur > 0) {
              this.videoDurationSec = Math.round(dur);
              videoDurationSec = this.videoDurationSec;
            }
          }

          this.watcherCount += 1;
          if (videoDurationSec > 0) {
            this.videoDurationSec = Math.round(videoDurationSec);
            if (videoDurationSec > 900) {
              // Video is > 15 minutes (900s). Limit watch time to random between 5m and 10m
              targetDurationMs = 300000 + Math.floor(Math.random() * 300000); // 300s to 600s
              insertLog({
                workerId: worker.id,
                url: this.configuredUrl,
                status: worker.status,
                message: `Simulating 'Full Watcher' profile (Long video >15m: limited watch time to ${Math.round(targetDurationMs / 1000)}s)${sourceSuffix}`,
                createdAt: new Date().toISOString(),
                ipAddress: worker.ipAddress
              });
            } else {
              // Watch full video duration + small padding
              targetDurationMs = Math.round(videoDurationSec * 1000) + 2000;
              insertLog({
                workerId: worker.id,
                url: this.configuredUrl,
                status: worker.status,
                message: `Simulating 'Full Watcher' profile (watching full video: ${Math.round(targetDurationMs / 1000)}s)${sourceSuffix}`,
                createdAt: new Date().toISOString(),
                ipAddress: worker.ipAddress
              });
            }
          } else {
            targetDurationMs = 60000 + Math.floor(Math.random() * 60000); // default 60s to 120s
            insertLog({
              workerId: worker.id,
              url: this.configuredUrl,
              status: worker.status,
              message: `Simulating 'Full Watcher' profile (duration undetected, watching for ${Math.round(targetDurationMs / 1000)}s)${sourceSuffix}`,
              createdAt: new Date().toISOString(),
              ipAddress: worker.ipAddress
            });
          }

          // Move cursor once to emulate active interest
          try {
            const targetX = Math.floor(Math.random() * viewport.width);
            const targetY = Math.floor(Math.random() * viewport.height);
            const mPos = await this.moveMouseHumanlike(page, currentMouseX, currentMouseY, targetX, targetY);
            currentMouseX = mPos.x;
            currentMouseY = mPos.y;
          } catch (e) {
            // ignore
          }
        }

        // Wait remaining time up to targetDurationMs
        const elapsed = performance.now() - started;
        const remaining = Math.max(1000, targetDurationMs - elapsed);
        await new Promise((resolve) => setTimeout(resolve, remaining));

        const responseTimeMs = Math.round(performance.now() - started);
        const status = response ? response.status() : 200;
        const ok = status >= 200 && status < 400;

        worker.status = ok ? "success" : "error";
        worker.httpStatus = status;
        worker.statusText = response ? response.statusText() : "OK";
        worker.responseTimeMs = responseTimeMs;
        worker.lastCheckedAt = new Date().toISOString();
        worker.progress = 0;
        this.recordResult(worker, ok, status, worker.statusText, responseTimeMs);
      } catch (error) {
        const responseTimeMs = Math.round(performance.now() - started);
        const message = error instanceof Error ? error.message.substring(0, 60) : "Failed";
        worker.status = "error";
        worker.statusText = message;
        worker.responseTimeMs = responseTimeMs;
        worker.lastCheckedAt = new Date().toISOString();
        worker.progress = 0;
        this.recordResult(worker, false, undefined, message, responseTimeMs);
      } finally {
        if (browser) {
          await browser.close().catch(() => undefined);
        }
        worker.inFlight = false;
        this.captureChartPoint();
      }
    });
  }

  private recordResult(
    worker: WorkerRuntime,
    ok: boolean,
    httpStatus: number | undefined,
    statusText: string | undefined,
    responseTimeMs: number
  ): void {
    if (ok) {
      this.successfulRequests += 1;
    } else {
      this.failedRequests += 1;
    }
    this.totalResponseTime += responseTimeMs;
    this.requestTimestamps.push(Date.now());

    // Increment referral counts
    if (worker.trafficSource === "instagram") {
      this.instagramCount += 1;
    } else if (worker.trafficSource === "whatsapp") {
      this.whatsappCount += 1;
    }

    const sourceText = worker.trafficSource !== "direct" ? ` [${worker.trafficSource === "instagram" ? "Instagram" : "WhatsApp"}]` : "";
    const message = httpStatus
      ? `User ${worker.id} (${worker.ipAddress}) -> ${httpStatus} ${statusText ?? ""} -> ${responseTimeMs} ms${sourceText}`
      : `User ${worker.id} (${worker.ipAddress}) -> ${statusText ?? "Error"} -> ${responseTimeMs} ms${sourceText}`;

    insertLog({
      workerId: worker.id,
      url: this.configuredUrl,
      status: ok ? "success" : "error",
      httpStatus,
      statusText,
      responseTimeMs,
      message,
      createdAt: new Date().toISOString(),
      ipAddress: worker.ipAddress
    });
  }

  private captureChartPoint(): void {
    const stats = this.getStats();
    this.chartHistory.push({
      timestamp: new Date().toISOString(),
      averageResponseTimeMs: stats.averageResponseTimeMs,
      requestsPerSecond: stats.requestsPerSecond,
      activeUsers: stats.activeUsers,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests
    });
    this.chartHistory = this.chartHistory.slice(-120);
  }

  private createWorkers(count: number, region = "all"): WorkerRuntime[] {
    const proxies = loadProxies();
    const usedIps = new Set<string>();

    return Array.from({ length: count }, (_, index) => {
      const proxyUrl = proxies.length > 0 ? proxies[index % proxies.length] : undefined;
      let ipAddress = "";
      if (proxyUrl) {
        try {
          const parsed = new URL(proxyUrl);
          ipAddress = parsed.hostname;
        } catch {
          do {
            ipAddress = generateRegionIP(region);
          } while (usedIps.has(ipAddress));
        }
      } else {
        do {
          ipAddress = generateRegionIP(region);
        } while (usedIps.has(ipAddress));
      }
      usedIps.add(ipAddress);

      // Distribute traffic sources: 33.3% Direct, 33.3% Instagram, 33.3% WhatsApp
      let trafficSource: "direct" | "instagram" | "whatsapp" = "direct";
      const sourceRand = index % 3;
      if (sourceRand === 1) {
        trafficSource = "instagram";
      } else if (sourceRand === 2) {
        trafficSource = "whatsapp";
      }

      return {
        id: index + 1,
        status: "waiting",
        isActive: false,
        progress: 0,
        inFlight: false,
        ipAddress,
        proxyStatus: proxyUrl ? "proxy" : "direct",
        trafficSource
      };
    });
  }

  private validateUrl(value: string): string {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported.");
      }
      return url.toString();
    } catch {
      throw new Error("Enter a valid HTTP or HTTPS URL.");
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(Math.floor(Number(value) || min), min), max);
  }

  private async playVideos(page: any): Promise<void> {
    const frames = page.frames();
    for (const frame of frames) {
      try {
        await frame.evaluate(() => {
          // Play standard HTML5 videos
          const videos = document.querySelectorAll("video");
          videos.forEach((video) => {
            video.muted = true;
            video.play().catch(() => {});
          });

          // Click common play buttons (e.g. YouTube, Vimeo, Dailymotion, general video plays)
          const playSelectors = [
            ".ytp-large-play-button",
            ".vimeo-play-button",
            "button[aria-label='Play']",
            ".ytp-play-button",
            "[class*='play-button']",
            "[aria-label*='play']",
            ".jw-icon-play",
            ".vjs-play-control"
          ];
          const buttons = document.querySelectorAll(playSelectors.join(", "));
          buttons.forEach((btn) => {
            if (btn instanceof HTMLElement) {
              btn.click();
            }
          });
        });
      } catch (e) {
        // ignore frame errors
      }
    }
  }

  private async detectVideoDuration(page: any): Promise<number> {
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const dur = await frame.evaluate(() => {
          // 1. Try standard video element duration
          const video = document.querySelector("video");
          if (video && !isNaN(video.duration) && video.duration > 0) {
            return video.duration;
          }

          // 2. Try checking YouTube's global page/iframe variables
          // @ts-ignore
          if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse?.videoDetails?.lengthSeconds) {
            // @ts-ignore
            return parseInt(ytInitialPlayerResponse.videoDetails.lengthSeconds, 10);
          }
          // @ts-ignore
          if (window.ytplayer?.config?.args?.length_seconds) {
            // @ts-ignore
            return parseInt(window.ytplayer.config.args.length_seconds, 10);
          }
          // @ts-ignore
          if (typeof ytPlayer !== 'undefined' && ytPlayer.getDuration) {
            // @ts-ignore
            return ytPlayer.getDuration();
          }

          // 3. Try checking Vimeo's __PRELOADED_STATE__
          // @ts-ignore
          if (window.__PRELOADED_STATE__?.player?.config?.video?.duration) {
            // @ts-ignore
            return window.__PRELOADED_STATE__.player.config.video.duration;
          }

          return 0;
        });

        if (dur > 0) {
          return dur;
        }
      } catch (e) {
        // ignore frame/context errors
      }
    }
    return 0;
  }

  private async moveMouseHumanlike(
    page: any,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): Promise<{ x: number; y: number }> {
    const steps = 12 + Math.floor(Math.random() * 8); // 12-20 steps
    const controlX = (startX + endX) / 2 + (Math.random() - 0.5) * 150;
    const controlY = (startY + endY) / 2 + (Math.random() - 0.5) * 150;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round((1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX);
      const y = Math.round((1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY);
      try {
        await page.mouse.move(x, y);
      } catch (e) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10 + Math.floor(Math.random() * 15)));
    }
    return { x: endX, y: endY };
  }

  openExternalBrowser(workerId: number, url: string): void {
    const worker = this.workers[workerId - 1];
    if (!worker) {
      throw new Error("Worker not found.");
    }

    const proxies = loadProxies();
    const proxyUrl = worker.proxyStatus === "proxy" && proxies.length > 0
      ? proxies[(worker.id - 1) % proxies.length]
      : undefined;

    if (proxyUrl) {
      const child = spawn("open", [
        "-na",
        "Google Chrome",
        "--args",
        `--proxy-server=${proxyUrl}`,
        `--user-data-dir=/tmp/chrome-user-data-worker-${worker.id}`,
        url
      ]);
      child.on("error", (err) => {
        console.error(`Failed to launch proxy browser for worker ${worker.id}:`, err);
      });
    } else {
      const child = spawn("open", [url]);
      child.on("error", (err) => {
        console.error(`Failed to open target URL:`, err);
      });
    }
  }
}

export const monitoringService = new MonitoringService();
