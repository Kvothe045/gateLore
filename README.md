# gateLore — Async Media Streaming Gateway for GATE Aspirants

> A high-performance, full-stack video lecture platform built for GATE exam preparation — combining a Next.js frontend with a FastAPI async streaming backend that uses Telegram as unlimited cloud storage.

**Live Demo:** [gatelores.vercel.app](https://gatelores.vercel.app)

---

## What is gateLore?

gateLore is a video-on-demand platform purpose-built for GATE CSE students. It streams multi-gigabyte lecture recordings with sub-500ms seek latency directly from Telegram's cloud infrastructure — no expensive blob storage, no CDN bills. The backend acts as a smart async proxy between Telegram and the browser, implementing HTTP 206 Partial Content streaming with a dual-path caching strategy to maximize both speed and disk efficiency.

The project was motivated by a simple problem: existing platforms either cost too much to host or couldn't handle random-access seeking on large video files without buffering. gateLore solves both.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER (Next.js)                        │
│   React 19 · Framer Motion · KaTeX · NextAuth · Tailwind     │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTP (Range requests, REST)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              Cloudflare (Reverse Proxy / CDN)                │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│            FastAPI Backend (Azure VM, Port 8000)             │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ streaming.py│   │  services.py │   │    tasks.py      │  │
│  │  HTTP 206   │◄──│ Telethon MTProto◄─│ Background Meta │  │
│  │ Range Logic │   │   Client     │   │   Fetch Jobs     │  │
│  └──────┬──────┘   └──────────────┘   └──────────────────┘  │
│         │                                                    │
│   ┌─────▼──────────────────────┐                            │
│   │     Dual-Path Cache        │                            │
│   │  /home/azureuser/vlogs/    │                            │
│   │  (stream-while-download    │                            │
│   │   vs. direct-proxy)        │                            │
│   └────────────────────────────┘                            │
└──────────────────────┬───────────────────────────────────────┘
                       │  MTProto (Telethon)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│             Telegram Cloud (Unlimited Storage)               │
│              Video files stored as channel messages          │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Engineering Achievements

### Sub-500ms Seek Latency via HTTP 206 Partial Content

The single hardest problem in video streaming is seek performance. When a user jumps to a timestamp deep in a 2GB lecture file, a naïve implementation would restart the download from byte 0, causing a multi-second stall. gateLore avoids this entirely.

**How it works:**

The browser's native `<video>` element sends HTTP Range requests: `Range: bytes=52428800-`. The streaming endpoint parses this header, extracts the exact `start` and `end` byte offsets, and forwards a precisely scoped request to Telegram via the Telethon MTProto client — fetching only the needed chunk, not the whole file.

```
Client                    FastAPI Backend               Telegram
  │                            │                            │
  │  GET /stream/1234          │                            │
  │  Range: bytes=52428800-    │                            │
  │ ─────────────────────────► │                            │
  │                            │  iter_download(offset=     │
  │                            │  52428800, chunk=65536)    │
  │                            │ ──────────────────────────►│
  │                            │◄── first chunk (65536 B) ──│
  │◄── HTTP 206, first bytes ──│                            │
  │  (< 500ms)                 │  continues streaming...    │
```

The response begins with `HTTP 206 Partial Content` and the correct `Content-Range` header, so the browser can immediately render that position in the video timeline. The first bytes reach the client before Telegram has even delivered the second chunk — zero-lag, zero-stall.

**Validated seek latency: < 500ms** — measured by timing the `206` response's `TTFB (Time To First Byte)` for range requests at arbitrary offsets across multiple file sizes and network conditions.

### Dual-Path Caching Strategy

Not all seeks should be handled identically. gateLore implements a decision tree that runs on every request:

**Path A — Stream-While-Download (sequential playback from 0:00)**

When a request has `Range: bytes=0-` (or no Range header), the server recognizes this as a fresh sequential play. It:
1. Opens an async generator over Telegram's `iter_download`
2. Yields each chunk to the HTTP response stream immediately (zero-lag start)
3. Simultaneously writes the same bytes to disk at `/home/azureuser/vlogs/<msg_id>.mp4`

Result: the file is cached on disk for future viewers, and the current viewer starts watching within milliseconds.

**Path B — Direct Proxy (random access / seek)**

When a request has a non-zero `Range` start offset, the server detects that writing to disk would corrupt the partially-written cache file (since the bytes would be out of order). Instead it:
1. Streams the requested byte range directly from Telegram to the client
2. Does **not** write to disk

Result: data integrity is preserved, the seek responds instantly, and the cache is never corrupted by interleaved random-access writes.

```
Incoming Range request
        │
        ▼
  start == 0?
   ┌────┴────┐
  YES        NO
   │          │
   ▼          ▼
Stream    Direct proxy
+Cache    from Telegram
to disk   (no disk write)
```

### Async Architecture — Why It Matters at Scale

The backend is single-process (required by Telethon's session file locking) but fully non-blocking via Python's `asyncio`. Every I/O operation — Telegram chunk fetches, disk writes, JSON reads — is awaited, meaning a single worker thread can handle dozens of concurrent streams without blocking.

This was stress-tested using **Locust**, simulating 70+ concurrent users each streaming different videos simultaneously. The server maintained stable response times with no worker starvation, validating that the async design scales well beyond typical classroom usage without requiring horizontal scaling.

---

## Performance Testing — How We Measured It

### Seek Latency (< 500ms)

**Tool:** `curl` with timing breakdown + browser DevTools Network tab

**Method:**
```bash
# Simulate a mid-video seek to byte offset ~50MB into a file
curl -v \
  -H "Range: bytes=52428800-" \
  -o /dev/null \
  -w "TTFB: %{time_starttransfer}s\n" \
  http://<backend-ip>:8000/stream/<msg_id>
```

We recorded `time_starttransfer` (TTFB for the 206 response) across:
- Multiple message IDs (different file sizes: 500MB–3GB)
- Range offsets at 10%, 25%, 50%, 75% file positions
- Cold cache (file not on disk) and warm cache (file partially downloaded)

Results consistently landed under 500ms for cold Telegram fetches on the Azure VM, and under 50ms for warm disk reads.

### Concurrent Load Testing (70+ users)

**Tool:** [Locust](https://locust.io)

**Locustfile pattern:**
```python
from locust import HttpUser, task, between
import random

class StreamUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def stream_video(self):
        msg_ids = [1001, 1002, 1003, ...]  # real message IDs
        msg_id = random.choice(msg_ids)
        
        # Simulate random seek
        offset = random.randint(0, 500_000_000)
        self.client.get(
            f"/stream/{msg_id}",
            headers={"Range": f"bytes={offset}-{offset + 2_097_152}"},
            stream=True,
            name="/stream/[msg_id]"
        )
```

**Run command:**
```bash
locust -f locustfile.py --host=http://<backend-ip>:8000 \
  --users=70 --spawn-rate=5 --run-time=2m --headless
```

**Observed metrics at 70 concurrent users:**
- Median response time: < 600ms
- 95th percentile: < 1200ms
- Failure rate: 0% (no worker crashes or session conflicts)
- Worker CPU usage: ~40% (single async worker, Azure B2s VM)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | React framework, SSR, routing |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first styling |
| Framer Motion | Animations and transitions |
| KaTeX | Mathematical formula rendering |
| NextAuth v4 | Authentication (session management) |
| CryptoJS | Client-side encryption utilities |
| Vercel Analytics | Usage tracking |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | Async HTTP server, routing, validation |
| Telethon | Telegram MTProto client (video source) |
| asyncio / AsyncIO | Non-blocking I/O for concurrent streaming |
| Pydantic | Data validation and API schema models |
| Python systemd service | Process management (single worker) |
| Cloudflare | Reverse proxy, DDoS protection, SSL |

### Infrastructure
| Component | Details |
|---|---|
| Frontend Hosting | Vercel |
| Backend Hosting | Azure VM (Ubuntu 24), port 8000 |
| Storage | Telegram Cloud (unlimited) + local disk cache (`/home/azureuser/vlogs/`) |
| Database | JSON flat files (`subjects.json`, `announcements.json`) |
| Auth Session | `gatelores_session.session` (Telethon) |

---

## Repository Structure

```
gateLore/                     # Frontend (this repo)
├── src/
│   └── app/                  # Next.js App Router pages and components
├── public/                   # Static assets
├── package.json              # Dependencies
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
└── tailwind / postcss config

Backend (separate deployment):
/backend/
├── main.py                   # FastAPI app entry point, route registration
├── config.py                 # Constants: paths, API keys, secrets
├── streaming.py              # Core: HTTP 206 range logic, dual-path cache
├── services.py               # Shared: Telethon client, in-memory state
├── tasks.py                  # Background: metadata prefetch (filenames, sizes)
├── utils.py                  # Helpers: file I/O, JSON read/write
├── models.py                 # Pydantic schemas for request/response validation
├── dependencies.py           # Middleware: API key authentication
├── subjects.json             # Subject list with lock status
└── announcements.json        # Broadcast messages
```

---

## API Reference

### Public Endpoints

```
GET /init?topic_id=<id>&topic_name=<name>
```
Returns the list of videos for a given subject/topic. Triggers a background metadata fetch from Telegram if the list is empty (filenames and sizes are resolved asynchronously via `tasks.py`).

```
GET /stream/<msg_id>
```
The core streaming endpoint. Accepts standard HTTP `Range` headers and returns `206 Partial Content`. Implements the dual-path cache decision (stream-while-download vs. direct proxy) described above.

```
GET /api/broadcast
```
Returns the current announcements/broadcast messages for display on the frontend.

### Admin Endpoints (require `x-api-key` header)

```
POST /admin/manage
```
Lock or unlock a subject folder to control student access.

```
GET /admin/system-stats
```
Returns disk usage and per-folder cache sizes.

```
GET /admin/migrate
```
Downloads the entire backend source and database as a `.zip` for portability/backup.

```
GET /admin/inspect/<folder>
```
Lists physical files present in a cache folder on disk.

```
DELETE /admin/delete/<folder>/<file>
```
Deletes a specific cached file to free disk space.

---

## Getting Started (Frontend)

```bash
# Clone the repository
git clone https://github.com/Kvothe045/gateLore.git
cd gateLore

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in NEXTAUTH_SECRET, BACKEND_URL, etc.

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

---

## Backend Deployment

The backend runs as a `systemd` service on an Azure Ubuntu VM.

```bash
# Start the server
sudo systemctl start vlog-server

# Stop the server
sudo systemctl stop vlog-server

# Check status / logs
sudo systemctl status vlog-server
```
