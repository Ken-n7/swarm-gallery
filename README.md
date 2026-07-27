# 🐝 Swarm Gallery

**Local-first, real-time photo & video sharing for events — no internet, no app install.**

Swarm Gallery turns a laptop into a self-contained event photo hub. The laptop runs the server (and typically a Wi-Fi hotspot); guests connect their phones to that network, scan a QR code, pick a username and profile picture, and start sharing. Every photo and video appears **instantly on everyone's screen** over WebSockets. When the event ends, the media can be handed off to the host and wiped from the server for privacy.

> Built for events like weddings, parties, and conferences where guests are physically together but you don't want to depend on the internet, a cloud service, or everyone downloading an app.

---

## Table of Contents

- [Why it exists](#why-it-exists)
- [Features](#features)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Data model](#data-model)
- [HTTP API](#http-api)
- [Realtime (Socket.IO) events](#realtime-socketio-events)
- [Getting started (development)](#getting-started-development)
- [Running on the event laptop (Windows)](#running-on-the-event-laptop-windows)
- [Configuration](#configuration)
- [Testing](#testing)
- [Documentation](#documentation)
- [Project status](#project-status)

---

## Why it exists

Cloud photo-sharing at events is fragile: venue Wi-Fi is flaky, mobile data is spotty, and asking guests to install an app kills participation. Swarm Gallery removes all of that. Everything runs on a **local network** the host controls, guests join with just a browser, and nothing leaves the room. Privacy is a first-class goal — media is ephemeral and deleted at the end.

---

## Features

- 📷 **Instant sharing** — upload a photo or video and it broadcasts to every connected device in real time.
- 🎥 **Photos *and* videos** — video uploads get an auto-generated thumbnail (via FFmpeg) and stream with HTTP range support.
- 📴 **Offline / local-first** — no internet required; the laptop is both server and (optionally) hotspot.
- 📱 **No app install** — guests use their phone's browser. A QR code takes them straight to the gallery.
- 🙋 **Guest identity** — username + profile picture set once, remembered in `localStorage` so rejoining skips the join screen. Avatars are shown next to each upload.
- ❤️ **Likes** — guests can like/unlike photos, with live like counts synced to everyone.
- 🗂️ **Personal album download** — each guest can download a ZIP of their own uploads.
- 👀 **Live guest count** — see how many people are currently connected.
- 🛡️ **Admin dashboard** — cookie-authenticated admin area (dashboard, galleries, guests, settings).
- 🧑‍🎨 **Face blur editor** — client-side face blurring workflow for privacy before/while sharing.
- 🌗 **Theme + PWA** — light/dark theming and a web app manifest for an installable, app-like feel.
- 🧹 **Owner controls** — guests can delete their own photos.

---

## How it works

```
Laptop runs the server (and usually a Wi-Fi hotspot)
  └── Phones connect to the local network
        └── Browser opens the guest URL (from a QR code)
              └── Guest enters username + profile pic (once, saved locally)
                    └── WebSocket connection established
                          └── Upload → server stores it → Socket.IO broadcast → every screen updates live
```

Guests scan → join → share. That's the whole loop.

---

## Architecture

A single workspace with two apps that run side by side:

- **`server/`** — a Node.js + Express 5 API with a Socket.IO realtime layer and a local SQLite database. Handles uploads (Multer), media storage, thumbnails (FFmpeg), likes, avatars, ZIP export, and admin auth. Serves media statically with range support.
- **`client/`** — a Next.js (App Router) + React 19 + TypeScript front end styled with Tailwind CSS 4. Contains the guest gallery, join screen, upload UI, face-blur editor, and the admin dashboard.

Default ports: **client on `3000`**, **server on `4000`**. The current build operates on a single hardcoded event (id `demo`); the schema and admin UI are structured to grow toward multi-event support.

Hotspot IPs (typical): Windows `192.168.137.1`, macOS `192.168.2.1` — the client's `next.config.ts` whitelists these for image loading alongside `localhost`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Front end | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Realtime (client) | `socket.io-client` |
| Back end | Node.js, Express 5, Socket.IO 4 |
| Database | SQLite via `better-sqlite3` |
| Uploads | Multer 2 (200 MB limit; images + common video formats) |
| Video thumbnails | `fluent-ffmpeg` + `ffmpeg-static` |
| ZIP export | `archiver` |
| IDs | `nanoid` |
| QR codes | `qrcode` |
| Local discovery | `bonjour-service` (mDNS) |
| Rate limiting / queue | `express-rate-limit`, `p-queue` |
| Scheduling | `node-cron` |
| Auth | signed cookies (`cookie-parser`) |
| Dev | `nodemon` |

**No Docker** — the laptop runs Node directly (simpler networking for the hotspot use case). File paths use `path.join()` throughout because development is on Linux while the deployment target is Windows.

---

## Repository layout

```
swarm-gallery/
├── client/                 # Next.js front end (guest + admin UIs)
│   ├── app/                # routes: /, /event/[id], /event/[id]/upload,
│   │                       #         /event/[id]/settings, /admin
│   ├── components/         # Gallery, JoinScreen, UploadPanel, PhotoViewer,
│   │                       # FaceBlurEditor, Admin/* dashboard, etc.
│   ├── hooks/              # useSocket, useGallery, useUser, useOrientation,
│   │                       # useFaceBlurWorkflow, useGuestPreferences
│   ├── lib/                # api.ts, faceBlur.ts, time.ts
│   └── app/manifest.ts     # PWA manifest
├── server/                 # Express + Socket.IO API
│   ├── index.js            # entry point: routes, uploads, sockets, likes
│   ├── config.js           # ports, storage paths, limits, secrets
│   ├── liveCount.js        # live guest-count tracking
│   ├── seed.js             # seed/reset demo data
│   ├── db/                 # SQLite connection + schema.sql
│   ├── routes/             # admin, events, users (+ photos/upload helpers)
│   ├── middleware/         # auth, validate, rateLimit
│   ├── sockets/            # Socket.IO setup
│   └── utils/              # qr, cleanup (cron), ip detection
├── scripts/                # bash: swarm-start / stop / restart / reset
├── tools/                  # PowerShell helpers (launch, ports, guest URL)
├── test/                   # api / smoke / browser test scripts
├── docs/                   # RUNBOOK, OPERATIONS, TESTING
├── start.bat / setup.bat   # one-click Windows launcher + setup
└── CLAUDE.md               # detailed project design context
```

---

## Data model

SQLite (`server/db/schema.sql`), created on first run:

- **`events`** — `id`, `name`, `created_at`, `status` (`active`/`closed`), plus handoff/closeout timestamps. A `demo` event is auto-inserted on startup.
- **`event_settings`** — organizer name, date, type, expected guests, retention policy, storage warning threshold.
- **`users`** — `id`, `event_id`, `username`, optional `device_id`, `avatar_filename`, `joined_at`, `last_seen`. Unique per `(event, username)` and per `(event, device)`.
- **`photos`** — `id`, `event_id`, `filename`, `original_name`, `mimetype`, `size_bytes`, `uploaded_at`, `user_id`, `uploader_ip`, `uploader_name`, `thumb_filename` (for videos), `flagged`.
- **`photo_likes`** — `(photo_id, user_id)` pairs with `liked_at`; cascades on delete.

Media lives on disk under `server/storage/events/<eventId>/` (photos + videos + thumbnails) and `server/storage/avatars/`, separate from the database.

---

## HTTP API

Base URL defaults to `http://<host>:4000`. Selected endpoints (see `server/index.js` and `server/routes/`):

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/upload` · `/upload/:eventId` | Upload a photo/video (`multipart/form-data`, field `photo`) |
| `GET` | `/photos-list` · `/photos-list/:eventId` | List media for an event (optional `?userId=` for like state) |
| `DELETE` | `/photos/:id` | Delete a photo (owner only, by `?username=`) |
| `POST` | `/photos/:id/like` | Like a photo (`{ userId }`) |
| `DELETE` | `/photos/:id/like` | Unlike a photo (`?userId=`) |
| `GET` | `/users/:id/album` | Download the user's own uploads as a ZIP |
| `POST` | `/users/join` | Register username + upload avatar |
| `GET` | `/avatars/...` | Static avatar images |
| `GET` | `/photos/...` | Static media (range requests supported for video) |
| `POST`/`GET` | `/admin/login` · `/admin/logout` | Admin auth (signed cookie) |
| — | `/events`, `/users` | Event and user routers |

Uploads accept JPEG/PNG/WebP/GIF and MP4/WebM/QuickTime/AVI, up to **200 MB**.

---

## Realtime (Socket.IO) events

On connect, the client passes its `userId` in the handshake (validated against the DB so stale local storage can't inflate the live count).

| Direction | Event | Description |
|---|---|---|
| server → client | `photo-history` | Full current gallery on connect |
| server → client | `new-photo` | A new photo/video was uploaded |
| server → client | `photo-deleted` | A photo was removed |
| server → client | `photo-liked` | Like count changed for a photo |
| server → client | `user-count` | Current live guest count |
| client → server | `ping` → `pong` | Keepalive; refreshes `last_seen` |

---

## Getting started (development)

**Requirements:** Node.js (developed on Node 24) and npm.

From the repo root, the bash helpers handle install, build, and launch:

```bash
npm start      # installs deps if needed, builds the client, starts server + client
npm stop       # stops both
npm restart    # stop + start
npm reset      # reset local state / demo data
```

Then open:

- **Admin:** http://localhost:3000/admin
- **Guest (demo event):** http://localhost:3000/event/demo

Prefer to run the two apps manually?

```bash
# terminal 1 — server (http://localhost:4000)
cd server && npm install && npm run dev

# terminal 2 — client (http://localhost:3000)
cd client && npm install && npm run dev
```

To populate demo content: `cd server && npm run seed` (also `seed:reset`, `seed:clear`, `seed:offline`).

---

## Running on the event laptop (Windows)

For the host machine, Node.js is the only prerequisite:

1. Run **`setup.bat`** once (installs dependencies, prepares `.env`, builds the client).
2. Run **`start.bat`** to launch. It checks for Node, ensures dependencies, starts the server and client, and prints the admin/guest URLs.
3. Share the **guest URL / QR code** (available from the admin Network view; `tools/get-guest-url.ps1` helps) with guests on the same network.

PowerShell helpers in `tools/` manage ports and process launching.

---

## Configuration

Server config lives in `server/config.js`, overridable via `server/.env` (see `server/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Server port |
| `CLIENT_PORT` | `3000` | Client port (reference) |
| `ADMIN_PASSWORD` | `admin123` | Admin login password — **change before a real event** |
| `COOKIE_SECRET` | `dev-secret` | Secret for signed admin cookies — **change before a real event** |

Other fixed settings: max upload size (200 MB), allowed MIME types, and storage paths. The client reads `NEXT_PUBLIC_SERVER_URL` (defaults to `http://localhost:4000`) for its SSR fallback.

---

## Testing

Node-based test scripts under `test/`:

```bash
npm run test:api       # API endpoint tests
npm run test:smoke     # smoke test
npm run test:browser   # browser-level checks
npm test               # api + smoke
```

See `docs/TESTING.md` for the verified baseline and manual verification steps.

---

## Documentation

- **`CLAUDE.md`** — full project design context: goals, network architecture, roadmap, and key decisions.
- **`docs/RUNBOOK.md`** — operational runbook: quick start, command reference, logs, pre-event checklist.
- **`docs/OPERATIONS.md`** — admin operations and the event closeout flow.
- **`docs/TESTING.md`** — testing guide and known setup gotchas.

---

## Project status

Actively **in development**. The core real-time sharing loop (join → upload → live gallery), guest identity/avatars, likes, video support with thumbnails, per-user album export, admin auth/dashboard, and the face-blur workflow are implemented. The current build targets a single hardcoded `demo` event; multi-event management and the full end-of-event handoff/wipe are on the roadmap (see `CLAUDE.md`). Not yet hardened for production — change the default admin password and cookie secret before any real event.
