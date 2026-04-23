# Swarm Gallery — Project Context

## What This Project Is

**Swarm Gallery** is a local-first, offline-capable real-time photo sharing app for events (weddings, parties, conferences). The laptop acts as both a Wi-Fi hotspot and server. Guests connect their phones to the hotspot, scan a QR code, enter a username and profile picture, and photos appear instantly on all devices via WebSockets. No internet required, no app install needed.

At the end of the event, all photos are packaged and handed off to the client, then deleted from the server for privacy.

---

## Repo

**GitHub:** https://github.com/Ken-n7/swarm-gallery

```
swarm-gallery/
  client/        ← Next.js frontend
  server/        ← Node.js/Express backend
  CLAUDE.md      ← this file
  .gitignore
  README.md
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16.2.4, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Node.js 24, Express 5, Socket.IO 4 |
| Database | SQLite via better-sqlite3 |
| File uploads | Multer 2 |
| IDs | nanoid |
| QR codes | qrcode |
| mDNS | bonjour-service |
| Rate limiting | express-rate-limit + p-queue |
| Scheduling | node-cron |
| Auth | signed cookies via cookie-parser |
| Dev server | nodemon |

**No Docker.** The laptop runs Node directly. Client runs on Windows, dev is on Ubuntu 24.

---

## Network Architecture

```
Laptop creates Wi-Fi hotspot
  └── Phones connect to hotspot
        └── Browser opens http://<hotspot-ip>:<port>
              └── User enters username + profile pic (once)
                    └── WebSocket connection established
                          └── Photos upload → server → Socket.IO broadcast → all clients update
```

**Hotspot IPs:**
- Windows: `192.168.137.1`
- Mac: `192.168.2.1`

---

## User Identity

Guests set a **username** and **profile picture** when they first join an event.

- **Persistence:** Saved in `localStorage` on the phone. Survives tab closes and browser restarts. Lost if the user clears browser data (acceptable — event is temporary).
- **Profile pictures:** Uploaded to the server into `server/storage/avatars/` (separate from event photos). This allows all devices to display other guests' avatars next to their photos. Avatars are wiped at event end along with everything else.
- **On rejoin:** If `localStorage` has a saved `userId` + `username` + `avatarUrl` for this event, the join screen is skipped automatically.
- **Socket association:** On WebSocket connect, the client sends their `userId` (from localStorage) so the server can associate socket sessions with users.

---

## Two Builds

### Demo Build (Phase 1–3)
- Hardcoded single event
- In-memory photo array (no DB)
- Flat file storage in `server/storage/demo/`
- QR code encodes hotspot IP
- Proves the core loop works: scan → join → upload → see instantly

### Full Build (Phase 4–14)
- SQLite multi-event support
- Admin auth (signed cookie)
- User identity with username + avatar
- Rate limiting + upload queue
- Photo expiry + cleanup cron
- mDNS discovery
- Photo flagging, ZIP downloads
- Per-user face blur toggle
- End-of-event handoff + full server wipe

---

## Database Schema (Full Build)

```sql
events (
  id, name, created_at, expires_at,
  sharing_enabled, blur_mode, photo_count, status  -- status: 'active' | 'closed'
)

users (
  id, event_id, username, avatar_filename,
  joined_at, last_seen
)

photos (
  id, event_id, user_id, filename, original_name,
  mimetype, size_bytes, uploaded_at, uploader_ip, flagged
)

sessions (
  socket_id, event_id, user_id, joined_at, last_seen
)
```

---

## API Routes (Full Build)

| Method | Route | Description |
|---|---|---|
| POST | `/events` | Create event |
| GET | `/events` | List events |
| DELETE | `/events/:id` | Delete event |
| POST | `/events/:id/close` | Close event — triggers handoff + wipe |
| POST | `/users/join` | Register username + upload avatar |
| GET | `/users/:id/avatar` | Serve avatar image |
| POST | `/upload/:eventId` | Upload photo |
| GET | `/photos` | List photos |
| DELETE | `/photos/:id` | Delete photo |
| PATCH | `/photos/:id/flag` | Flag a photo |
| POST | `/admin/login` | Admin login |
| GET | `/admin/logout` | Admin logout |
| GET | `/events/:id/qr` | Get QR code |
| PATCH | `/events/:id/settings` | Update settings |
| GET | `/events/:id/export` | Trigger ZIP download |

---

## Socket.IO Events

| Direction | Event | Payload | Description |
|---|---|---|---|
| client → server | `join-event` | `{ eventId, userId }` | Join an event room |
| client → server | `ping` | — | Keepalive |
| server → client | `new-photo` | photo object | New photo uploaded |
| server → client | `photo-deleted` | `{ photoId }` | Photo removed |
| server → client | `sharing-update` | `{ enabled }` | Sharing toggle changed |
| server → client | `user-count` | `{ count }` | Current viewer count |
| server → client | `user-joined` | user object | New guest joined |
| server → client | `event-closing` | — | Admin triggered end-of-event |

Rooms are scoped per `eventId`.

---

## End-of-Event Flow

When the admin closes an event:

1. Server emits `event-closing` to all connected clients (UI shows "Event has ended" message)
2. Server packages all event photos into a ZIP file (`event-<id>-<name>.zip`)
3. ZIP is available for admin to download from the dashboard
4. ZIP is also written to a local folder on the laptop: `server/exports/<eventId>/`
5. Server deletes:
   - All rows in `photos`, `users`, `sessions` for this event
   - `server/storage/events/<eventId>/` (event photos)
   - `server/storage/avatars/<eventId>/` (user avatars)
   - Event marked as `status: 'closed'` in DB (or fully deleted — TBD)
6. Export folder (`server/exports/`) is NOT deleted — that's the client's copy

**Privacy guarantee:** After close, no guest photos or personal data remain on the server.

---

## File Structure

### Server (`server/`)
```
index.js                ← entry point
config.js               ← env/config
db/
  index.js              ← DB connection
  schema.sql            ← DB schema
routes/
  upload.js             ← POST /upload/:eventId
  photos.js             ← GET/DELETE/flag /photos
  events.js             ← CRUD /events + close
  users.js              ← POST /users/join, GET avatar
  admin.js              ← POST/GET /admin/login|logout
sockets/
  index.js              ← Socket.IO setup
middleware/
  auth.js               ← cookie auth middleware
  validate.js           ← request validation
  rateLimit.js          ← rate limiting
utils/
  cleanup.js            ← photo expiry cron
  qr.js                 ← QR code generation
  ip.js                 ← hotspot IP detection
  export.js             ← ZIP packaging + local folder export
storage/
  events/               ← uploaded event photos (wiped at event end)
  avatars/              ← user profile pictures (wiped at event end)
exports/                ← post-event ZIP exports (kept permanently)
qr/                     ← generated QR PNG files
```

### Client (`client/`)
```
app/
  page.tsx              ← redirect or landing
  layout.tsx            ← root layout with Geist font
  globals.css           ← Tailwind 4 import
  event/[id]/
    page.tsx            ← join screen → gallery view
  admin/
    page.tsx            ← admin dashboard
components/
  JoinScreen.tsx        ← username + avatar upload form
  Gallery.tsx           ← masonry photo grid
  PhotoCard.tsx         ← single photo with uploader info
  UploadZone.tsx        ← camera/file upload UI
  UserAvatar.tsx        ← avatar display
hooks/
  useUser.ts            ← localStorage identity management
  useSocket.ts          ← Socket.IO connection
  useGallery.ts         ← photo state + real-time updates
types/
  index.ts              ← shared TypeScript types
lib/
  api.ts                ← fetch wrappers
  compress.ts           ← client-side image compression before upload
```

---

## Figma Designs

**File:** https://www.figma.com/design/VZQaaXHuLKBSlu3TO35qdv/Untitled

Three screens exist:

1. **Landing page** — hero "Your Event. Everyone's gallery." + feature cards + 4-step how-it-works. Guests skip this — they go straight to the join/gallery screen after QR scan.

2. **Guest view** — 3-panel desktop layout: left sidebar (event info, filters, privacy toggles), center masonry photo grid, right panel (upload drop zone + personal album). Has "Download full gallery ZIP" and per-user face blur toggle.

3. **Admin dashboard** — sidebar nav (Dashboard, Galleries, Guests, Settings), photo grid with uploader/device info, live stats, bulk actions, storage bar.

**Roadmap gaps in designs:** photo flagging, per-user blur, ZIP export, device tracking visible in UI but not yet fully specced in backend.

---

## Development Roadmap

| Phase | Name | Status |
|---|---|---|
| 1 | Network connection proof | 🔲 TODO |
| 2 | Express + Socket.IO + upload server | 🔲 TODO |
| 3 | Next.js frontend — camera + gallery | 🔲 TODO |
| 4 | SQLite setup | 🔲 TODO |
| 5 | Admin auth | 🔲 TODO |
| 6 | User identity (join screen, avatars, localStorage) | 🔲 TODO |
| 7 | Multi-event management | 🔲 TODO |
| 8 | Guest UI from Figma | 🔲 TODO |
| 9 | Admin dashboard from Figma | 🔲 TODO |
| 10 | Rate limiting + upload queue | 🔲 TODO |
| 11 | Photo cleanup + expiry | 🔲 TODO |
| 12 | mDNS + network resilience | 🔲 TODO |
| 13 | End-of-event handoff (ZIP + local export + server wipe) | 🔲 TODO |
| 14 | Photo flagging | 🔲 TODO |
| 15 | Polish + event readiness | 🔲 TODO |

**Current status: Phase 1 not yet started. All server and client files are empty placeholders.**

---

## Key Decisions

- **No Docker** — adds networking complexity on Windows for hotspot use case
- **No internet dependency** — everything runs on the local network
- **Single `node index.js`** startup command for the server
- **`path.join()`** everywhere — dev on Ubuntu, client runs on Windows
- **Ship with `start.bat`** for Windows clients — Node.js is the only required install
- **Client-side image compression** before upload to reduce bandwidth on local network
- **Phones go directly to join/gallery screen** after QR scan, not a landing page
- **User identity in localStorage** — simple, no server session overhead, naturally ephemeral
- **Avatars on server** (separate storage) so all devices can display them
- **End-of-event wipe is hard delete** — no soft delete, no recovery. Privacy is the priority.
- **Exports folder is never auto-deleted** — that's the client's permanent copy

---

## Environment

- Developer machine: Ubuntu 24, IdeaPad Slim 3
- Node: v24.15.0 (LTS "Krypton"), npm: v11.12.1 (via nvm)
- Client deployment target: Windows laptop
- SSH key configured for GitHub

---

## Coding Conventions

- Server: CommonJS (`require`/`module.exports`) — plain Node.js, no build step
- Client: ESM + TypeScript, Next.js App Router
- Use `path.join()` for all file paths (cross-platform)
- Environment variables via `.env` + dotenv (never commit `.env`)
- Keep server startup as simple as possible — single file entry point