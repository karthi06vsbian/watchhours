import { Router } from "express";
import { z } from "zod";
import { monitoringService } from "./monitoringService.js";

const router = Router();

const startSchema = z.object({
  url: z.string().trim().min(1),
  workerCount: z.coerce.number().int().min(1).max(1000),
  intervalMs: z.coerce.number().int().min(1000).max(60000),
  region: z.string().trim().optional()
});

router.post("/start", (request, response) => {
  const parsed = startSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
    return;
  }

  try {
    response.json(monitoringService.start(parsed.data));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Unable to start monitor." });
  }
});

router.post("/stop", (_request, response) => {
  response.json({ stats: monitoringService.stop(), workers: monitoringService.getWorkers() });
});

router.post("/reset", (_request, response) => {
  response.json(monitoringService.reset());
});

router.post("/open-browser", (request, response) => {
  const { workerId, url } = request.body;
  if (typeof workerId !== "number" || typeof url !== "string") {
    response.status(400).json({ error: "Invalid parameters." });
    return;
  }

  try {
    monitoringService.openExternalBrowser(workerId, url);
    response.json({ success: true });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Failed to open browser." });
  }
});

router.get("/stats", (_request, response) => {
  response.json({
    stats: monitoringService.getStats(),
    chartHistory: monitoringService.getChartHistory()
  });
});

router.get("/logs", (request, response) => {
  const limit = Number(request.query.limit ?? 300);
  response.json({ logs: monitoringService.getLogs(limit) });
});

router.get("/workers", (_request, response) => {
  response.json({ workers: monitoringService.getWorkers() });
});

export { router };
