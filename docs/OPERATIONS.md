# Swarm Gallery — Admin Operations

## Purpose

This document captures the currently verified admin operational workflow,
privacy model, and moderation behavior.

---

## Admin Closeout Flow

The intended end-of-event sequence is:

1. `Export Package`
2. `Mark Handoff Complete`
3. `Delete Event Media`
4. `Delete Event`

These steps are guarded in order.

### 1. Export Package

What it does:
- prepares the event handoff package
- marks the event as `handoff_prepared`
- makes a ZIP download available

What the ZIP contains:
- event media files
- a `manifest.json` with export metadata

### 2. Mark Handoff Complete

What it means:
- the client has received the handoff package
- the event is ready for media deletion

Guard:
- should only happen after `Export Package`

### 3. Delete Event Media

What it does:
- removes uploaded event media from the server
- clears the public gallery data for that event
- marks the event as `media_deleted`

Guard:
- requires `Mark Handoff Complete` first

### 4. Delete Event

What it does:
- removes remaining guest metadata for the event
- closes the event record
- marks the event as `closed`

Guard:
- requires `Delete Event Media` first

---

## Verified End-to-End Behavior

The following flow has been verified:

- create/join guests
- upload media
- confirm media appears in admin
- export handoff ZIP
- mark handoff complete
- delete event media
- confirm public gallery is empty afterward
- delete event record
- confirm guest metadata is gone afterward
- confirm event status becomes `closed`

The guard rails also behaved correctly:
- deleting media before handoff completion is rejected
- deleting the event before media deletion is rejected

---

## Privacy Model

Swarm Gallery is designed as a temporary event capture and handoff system.

Key assumptions:
- the server is the event laptop on a local network
- guest identity is stored locally in each guest browser for rejoin convenience
- the server stores event media and event guest records only for the duration of the event workflow
- after handoff, media should be deleted from the server for privacy
- after final closeout, guest metadata should also be removed from the active event state

Operational privacy rule:
- the laptop is not intended to remain a long-term archive of guest media

---

## Temporary Storage

`Temporary Storage` is informational, not a separate cleanup system.

Current meaning:
- shows how much event storage is being used
- allows warning threshold and retention-related settings to be displayed

What it does not do anymore:
- there is no separate `Clear temporary cache` action

Reason:
- generated thumbnails and original media are removed as part of the normal closeout flow
- a separate cache-clearing action adds confusion without helping the real workflow

---

## Moderation

Current moderation model is intentionally lightweight.

What moderation means:
- admin can manually mark uploaded media as `flagged`
- flagged media appears in the `Flagged` filter
- admin can review a flagged item and mark it reviewed

What moderation does not mean:
- no guest removal
- no participant banning
- no separate moderation queue backend beyond the `flagged` field/state

Product rule:
- admin moderates uploaded media only
- admin does not remove guests from the event

---

## Known Operational Notes

- Admin auth uses signed cookies.
- Browser admin flows require:
  - server restart after backend auth/CORS changes
  - client rebuild after frontend admin API/auth changes
  - browser re-login after those restarts
- For laptop-only browser testing, the client must be built against `http://localhost:4000`
- For other devices, the client must be built against the laptop’s current LAN/hotspot IP

---

## Current Open Questions

These are still product decisions rather than verified finished behavior:

- whether export history/status needs a richer UI
- whether moderation should ever grow beyond simple flag/review state
