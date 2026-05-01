# Swarm Gallery — Runbook

## Start the server

```bash
cd server
node index.js
```

Runs on port **4000**. Listens on all interfaces (`0.0.0.0`) so phones on the hotspot can reach it.

---

## Start the client

### Local testing (laptop only)

Make sure `.env.local` has:
```
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

Then:
```bash
cd client
npm run build
npm start -- -H 0.0.0.0
```

Runs on port **3000**.

### Phone / hotspot testing

> **The IP changes every session.** It depends on which network you join and DHCP.
> Always check the current IP before building — do not assume it's the same as last time.

1. Connect the laptop to the phone's hotspot (or create a Wi-Fi hotspot on the laptop)
2. Find the laptop's current IP on that network:
   ```bash
   ip route get 8.8.8.8 | grep -oP 'src \K\S+'
   ```
   Gives the IP the laptop uses for outbound traffic — works correctly as long as the hotspot is your default route (it usually is).
   If the result looks wrong, fall back to:
   ```bash
   ip addr show | grep "inet " | grep -v 127
   ```
   and pick the IP on the hotspot interface (usually `10.x.x.x`).
3. Update `.env.local` with that IP:
   ```
   NEXT_PUBLIC_SERVER_URL=http://<laptop-ip>:4000
   ```
4. Rebuild and start (required after every `.env.local` change):
   ```bash
   cd client
   npm run build
   npm start -- -H 0.0.0.0
   ```
5. Phones open `http://<laptop-ip>:3000` in their browser

> **Important:** Always rebuild after changing `.env.local` — the server URL is baked in at build time.

---

## Stop everything

```bash
# Kill client (port 3000)
fuser -k 3000/tcp

# Kill server (port 4000)
fuser -k 4000/tcp
```

Or find and kill by PID:
```bash
ss -tlnp | grep -E '3000|4000'
kill -9 <pid>
```

---

## Clear all data (full reset)

Wipes the database, all uploaded photos, and all avatars. Does **not** touch code.

```bash
# Database
rm -f server/data/gallery.db \
      server/data/gallery.db-shm \
      server/data/gallery.db-wal

# Uploaded event photos
rm -rf server/storage/events/demo

# Guest avatars
rm -rf server/storage/avatars/demo
```

After this, restart the server — it will recreate the database and seed the demo event automatically.

---

## Clear only photos (keep users)

```bash
rm -rf server/storage/events/demo
```

Then restart the server. Users in the DB are preserved but their photos are gone.

---

## Check what's running on a port

```bash
ss -tlnp | grep 3000
ss -tlnp | grep 4000
```

---

## View server logs

The server logs to stdout. To save logs to a file while running:
```bash
cd server
node index.js 2>&1 | tee server.log
```

---

## Admin login

Default credentials (set in `server/.env`):
- **Password:** `admin123`

Change before any real event by editing `server/.env`:
```
ADMIN_PASSWORD=your-secure-password
```

Admin routes: `POST /admin/login`, `GET /admin/logout`, `GET /admin/me`

---

## Environment files

| File | Purpose | Committed? |
|---|---|---|
| `server/.env` | Server port, admin password, cookie secret | No — never commit |
| `client/.env.local` | Server URL for the client build | No — never commit |

### server/.env defaults
```
PORT=4000
ADMIN_PASSWORD=admin123
COOKIE_SECRET=change-this-secret-before-event
```

### client/.env.local
```
NEXT_PUBLIC_SERVER_URL=http://localhost:4000   ← local dev
NEXT_PUBLIC_SERVER_URL=http://10.200.122.39:4000  ← phone/hotspot
```

---

## Before a real event — checklist

- [ ] Change `ADMIN_PASSWORD` in `server/.env`
- [ ] Change `COOKIE_SECRET` in `server/.env` to a long random string
- [ ] Set `NEXT_PUBLIC_SERVER_URL` to the laptop's hotspot IP
- [ ] Run `npm run build` in `client/`
- [ ] Clear all old data (see above)
- [ ] Start server: `node index.js`
- [ ] Start client: `npm start -- -H 0.0.0.0`
- [ ] Test join from a phone before guests arrive
- [ ] Test upload from a phone before guests arrive

---

## After an event — cleanup

```bash
# Wipe everything
rm -f server/data/gallery.db server/data/gallery.db-shm server/data/gallery.db-wal
rm -rf server/storage/events/demo
rm -rf server/storage/avatars/demo
```

> Phase 13 will automate this with a ZIP export + server wipe triggered from the admin panel.

---

## Hotspot IPs (reference)

| Setup | Laptop IP |
|---|---|
| Phone hotspot → laptop connects | depends on phone (check `ip addr`) |
| Windows laptop hotspot | `192.168.137.1` |
| Mac laptop hotspot | `192.168.2.1` |

---

## Useful one-liners

```bash
# Quick smoke test — are both services up?
curl http://localhost:4000/health && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# List photos currently in the gallery
curl http://localhost:4000/photos-list/demo

# Count photos
curl -s http://localhost:4000/photos-list/demo | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'photos')"

# Test admin login
curl -s -X POST http://localhost:4000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'
```
