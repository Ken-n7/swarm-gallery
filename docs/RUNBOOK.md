# Swarm Gallery — Current Runbook

## Purpose

This runbook reflects the current working startup flow using the repo-level
`swarm:*` helper commands, without changing the legacy root-level runbook.

---

## Quick Start

From the repo root:

### Laptop-only browser testing

```bash
npm run swarm:init-local
npm run swarm:start
```

This sets:
- `server/.env` -> `CLIENT_URL=http://localhost:3000`
- `client/.env.local` -> `NEXT_PUBLIC_SERVER_URL=http://localhost:4000`

Then opens:

```text
http://localhost:3000
http://localhost:3000/admin
```

### Network testing for phones, tablets, or other laptops

```bash
npm run swarm:init-network
npm run swarm:start
```

This detects the laptop's current LAN IP and writes:
- `server/.env` -> `CLIENT_URL=http://<current-ip>:3000`
- `client/.env.local` -> `NEXT_PUBLIC_SERVER_URL=http://<current-ip>:4000`

Other devices then open:

```text
http://<current-ip>:3000
```

---

## Command Reference

Run all commands from the repo root.

### `npm run swarm:init-local`

- creates missing env files
- sets up localhost mode for laptop-only testing
- ensures server defaults exist:
  - `PORT=4000`
  - `ADMIN_PASSWORD=admin123`
  - `COOKIE_SECRET=change-this-secret-before-event`

### `npm run swarm:init-network`

- creates missing env files
- detects the current LAN IP
- updates both env files for network/device testing
- ensures the same server defaults exist

### `npm run swarm:sync-ip`

- re-detects the current LAN IP
- updates both env files
- use this after changing networks without recreating the env files

Typical follow-up:

```bash
npm run swarm:sync-ip
npm run swarm:restart
```

### `npm run swarm:start`

- builds the client
- starts server and client in the background
- stores logs under `.run/logs/`
- stores PIDs under `.run/`
- waits for the app to come up
- opens `http://localhost:3000/admin` automatically in the browser

To skip auto-open for one run:

```bash
SWARM_OPEN_ADMIN=0 npm run swarm:start
```

### `npm run swarm:stop`

- stops both services
- also clears ports `3000` and `4000` if needed

### `npm run swarm:restart`

- runs stop, then start

### `npm run swarm:reset`

- stops both services
- deletes demo DB files
- deletes uploaded event media
- deletes guest avatars
- leaves the project ready for a fresh start

Typical reset flow:

```bash
npm run swarm:reset
npm run swarm:start
```

---

## Logs and Runtime Files

Generated runtime state lives in:

```text
.run/
```

Important files:
- `.run/server.pid`
- `.run/client.pid`
- `.run/logs/server.log`
- `.run/logs/client.log`
- `.run/logs/client-build.log`

These are ignored by git.

---

## Admin Notes

Default admin password:

```text
admin123
```

Admin behavior depends on signed cookies across the client/server split.

If admin appears blank or stale:
- restart the server after backend auth/CORS changes
- rebuild/restart the client after frontend API/auth changes
- log in again after those restarts

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

## Before a Real Event

1. Run `npm run swarm:init-network`
2. Change `ADMIN_PASSWORD` in `server/.env`
3. Change `COOKIE_SECRET` in `server/.env`
4. Run `npm run swarm:reset`
5. Run `npm run swarm:start`
6. Test join and upload from a real guest device

---

## Notes

- `localhost` is only correct for browser testing on the same laptop
- network mode should be re-synced if the laptop IP changes
- the client server URL is baked in at build time, so env changes must be
  followed by a restart/build cycle
