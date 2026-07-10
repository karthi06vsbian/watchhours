# Website Monitor Simulator

Website Monitor Simulator is an educational full-stack app that simulates up to 100 virtual users checking a website you own or have explicit permission to test.

It intentionally does **not** rotate IP addresses, bypass rate limits, evade protections, or simulate different public IPs. All requests are made normally from the backend process.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Chart.js
- Node.js + Express + TypeScript
- SQLite
- Docker Compose

## Project Structure

```text
client/   React UI, charts, dashboard, user grid
server/   Express API, monitoring engine, SQLite persistence
shared/   Shared TypeScript types
```

## Local Setup

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:4000`.

## Docker Setup

```bash
docker compose up --build
```

Open `http://localhost:5173`.

## API

- `POST /start`
- `POST /stop`
- `POST /reset`
- `GET /stats`
- `GET /logs`
- `GET /workers`

Example start request:

```bash
curl -X POST http://localhost:4000/start \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","workerCount":20,"intervalMs":5000}'
```

## Safety Notes

- Use only on URLs you own or are authorized to monitor.
- Worker count is capped at 100.
- Monitoring interval has a server-side minimum of 1000 ms.
- The engine does not alter network identity, proxies, headers for evasion, or rate-limit behavior.
