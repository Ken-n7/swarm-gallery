# Swarm Gallery — Current Testing Guide

## Purpose

This file reflects the current verification workflow without modifying the
legacy root-level testing notes.

---

## Current Verified Baseline

These backend and integration checks have already been confirmed recently:

- client production build succeeds
- server starts cleanly
- admin login/logout works
- guest join works
- guest upload works
- admin stats reflect guest/photo counts
- admin guests list reflects joined guests
- admin photos list reflects uploaded media
- admin settings load works
- guest list export works
- guest album export works
- gallery moderation flagging works
- handoff/export/delete routes work end to end

---

## Browser Verification

Use Brave on the laptop after starting the system in laptop-only mode.

### Admin

Verify:

- Dashboard shows current totals
- Galleries shows uploaded media
- `Flagged` filter only shows truly flagged media
- grid/list toggle works
- selection works
- review panel opens and can mark media reviewed
- Guests shows joined guests and correct photo counts
- `Export guest list` downloads
- `Download their album` downloads
- `Remove photos` removes guest media only
- Settings loads current event info
- `Save Changes` persists
- `Discard` returns to last saved state
- `Temporary Storage` has no cache-clearing action
- closeout buttons enable in the right order

### Layout

Verify:

- desktop width around `1280px`
- larger desktop width around `1440px`
- tablet-ish width / narrow laptop
- sidebar and top bar remain usable

### Still useful to verify manually

- dashboard loading state
- empty states after a reset with no guests or photos
- periodic refresh behavior after new uploads

---

## Suggested Reset-Then-Test Flow

1. Reset demo data
2. Restart server
3. Rebuild and restart client
4. Join with at least two guest identities
5. Upload at least two photos
6. Log into admin
7. Verify Dashboard, Galleries, Guests, Settings
8. Optionally run closeout flow on a separate pass

---

## Smoke Commands

### Join test user

```bash
curl -s -X POST http://localhost:4000/users/join \
  -F "username=TestUser" \
  -F "eventId=demo"
```

### Upload test image

```bash
curl -s -X POST http://localhost:4000/upload/demo \
  -F "username=TestUser" \
  -F "photo=@/path/to/photo.png"
```

### Admin stats

```bash
curl -s http://localhost:4000/admin/stats?eventId=demo
```

### Public gallery list

```bash
curl -s http://localhost:4000/photos-list/demo
```

---

## Known Setup Gotchas

- If admin appears blank in the browser, check `client/.env.local`
- For laptop-only testing, `NEXT_PUBLIC_SERVER_URL` must be `http://localhost:4000`
- For other devices, `NEXT_PUBLIC_SERVER_URL` must be the laptop’s current LAN/hotspot IP
- After changing `client/.env.local`, rebuild the client
- After server auth/CORS changes, restart the server
- After frontend admin API/auth changes, rebuild the client and log into admin again

---

## Remaining Verification Gaps

These still deserve explicit confirmation as the product settles:

- dashboard loading and empty states
- periodic admin refresh after live uploads
- whether retention options in Settings should remain real options
- final documentation consistency across the repo
