import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { router } from "./routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  })
);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));
app.use("/api", router);
app.use(router);

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.listen(port, () => {
  console.log(`Website Monitor Simulator API listening on http://localhost:${port}`);
});
