# Swarm Gallery — Current Runbook

## Purpose

This runbook reflects the current working startup and verification flow without
changing the legacy root-level runbook.

---

## Startup Modes

### Laptop-only browser testing

Use this when testing on the same laptop in Brave or another local browser.

Set [client/.env.local](/home/ken/Workspace/swarm-gallery/client/.env.local) to:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

Then start everything:

```bash
cd /home/ken/Workspace/swarm-gallery/server
node index.js
```

```bash
cd /home/ken/Workspace/swarm-gallery/client
npm run build
npm start -- -H 0.0.0.0
```

Open:

```text
http://localhost:3000
http://localhost:3000/admin
```

### LAN / hotspot testing for other devices

Use this when phones, tablets, or other laptops connect to the server laptop.

1. Find the laptop IP on the active network.

Suggested command:

```bash
ip route get 8.8.8.8 | grep -oP 'src \K\S+'
```

2. Set [client/.env.local](/home/ken/Workspace/swarm-gallery/client/.env.local) to:

```env
NEXT_PUBLIC_SERVER_URL=http://<laptop-ip>:4000
```

3. Rebuild the client after changing the env file.

```bash
cd /home/ken/Workspace/swarm-gallery/client
npm run build
npm start -- -H 0.0.0.0
```

4. Start the server if it is not already running.

```bash
cd /home/ken/Workspace/swarm-gallery/server
node index.js
```

5. Open from other devices:

```text
http://<laptop-ip>:3000
```

Important:
- The client build bakes in `NEXT_PUBLIC_SERVER_URL`
- If that value changes, rebuild the client
- `localhost` is only correct for browser testing on the same laptop

---

## Full Reset

Clear the demo event data:

```bash
rm -f /home/ken/Workspace/swarm-gallery/server/data/gallery.db \
      /home/ken/Workspace/swarm-gallery/server/data/gallery.db-shm \
      /home/ken/Workspace/swarm-gallery/server/data/gallery.db-wal

rm -rf /home/ken/Workspace/swarm-gallery/server/storage/events/demo
rm -rf /home/ken/Workspace/swarm-gallery/server/storage/avatars/demo
```

Then restart the server. It will recreate the DB and seed the `demo` event.

---

## Admin Notes

Default admin password:

```text
admin123
```

Admin behavior now depends on signed cookies across the client/server split.

Current requirements for admin to work in the browser:
- server must be restarted after backend auth/CORS changes
- client must be rebuilt after frontend API/auth changes
- browser must log in again after those restarts

---

## Current Closeout Flow

The intended event closeout sequence is:

1. `Export Package`
2. `Mark Handoff Complete`
3. `Delete Event Media`
4. `Delete Event`

`Temporary Storage` is informational only. There is no separate cache-clearing
step anymore.

---

## Quick Checks

### Service health

```bash
curl http://localhost:4000/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

### Public gallery data

```bash
curl http://localhost:4000/photos-list/demo
```

### Admin login

```bash
curl -s -X POST http://localhost:4000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'
```

---

## Stop Services

```bash
fuser -k 3000/tcp
fuser -k 4000/tcp
```

Or inspect first:

```bash
ss -tlnp | grep -E '3000|4000'
```
