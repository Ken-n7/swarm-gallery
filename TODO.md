# Swarm Gallery Todo

## Purpose

This file is the working source of truth for completing Swarm Gallery.

Use it to:
- track what is already done
- track what is intentionally changed from the original handoff
- decide what gets built next
- record what is blocked, partial, or still placeholder-only

Update statuses as work lands.

Working rule:
- after each completed task, update this file immediately

---

## Status Legend

- `[x]` Done
- `[-]` In progress / partial
- `[ ]` Not started
- `[!]` Needs decision or has risk
- `[~]` Intentionally changed from the original prototype

---

## Product Snapshot

Swarm Gallery is an event photo-sharing system with:
- a guest experience for joining an event, uploading media, browsing the shared gallery, and managing guest-side settings
- an admin experience for hosts/operators to monitor the event, manage media/guests, handle QR access, and complete privacy-first client handoff

### Locked Product Decisions

- [x] Admin is primarily optimized for desktop and tablet/iPad use
- [x] Settings in admin are a single page, not a dropdown of sub-pages
- [x] Admin settings sections are:
  - Event Info
  - Access & QR
  - Temporary Storage
  - Danger Zone
- [x] `Upload Controls` has been removed from admin
- [x] `Privacy` has been removed from admin
- [x] Face blur is guest-controlled before upload
- [x] Face blur is not an admin setting
- [x] Media is temporary and should be handed off to the client after the event
- [x] After handoff, event media should be deleted from the system for privacy reasons
- [x] `Flagged` should remain in admin galleries because moderation is still expected

---

## Current Implementation Snapshot

### Guest UI

- [x] Main guest screens exist
- [x] Shared design tokens are implemented
- [x] Welcome/onboarding exists
- [x] Gallery UI exists
- [x] Upload UI exists
- [x] Guest settings UI exists
- [x] Photo viewer UI exists
- [x] Orientation-aware guest layout exists
- [ ] Face blur tool is not implemented yet
- [ ] Like state is still local-only and not synced to server
- [ ] Guest bottom sheets version of upload/settings is not implemented
- [ ] Responsive mini/collapsed variants for sidebar/upload panel are not finished

### Admin UI

- [x] Admin login screen exists
- [x] Admin layout, sidebar, and top bar exist
- [x] Dashboard, Galleries, Guests, and Settings pages exist
- [x] Admin token alignment pass is largely done
- [x] Desktop/tablet responsiveness is in much better shape
- [x] Single-page Settings flow is in place
- [x] Settings now has client-side workflow behavior for save/discard, handoff state, and destructive confirmations
- [x] Galleries now has client-side selection, moderation review, and destructive-action behavior
- [x] Guests now has client-side export, review, and destructive-action behavior
- [x] `client/app/admin/page.tsx` is now lint-clean and no longer uses raw `<img>` tags
- [x] Admin page has been split into dedicated page components and shared admin UI modules
- [x] Admin UI structure is largely complete
- [-] Many actions are still client-only and not wired to backend operations yet
- [-] Some HCI safety work still needs deeper confirmation/error/success flows outside Settings
- [ ] Decide whether the broader client codebase should also be migrated away from remaining raw `<img>` usage

### Backend / API

- [x] Guest join API exists
- [x] Username change API exists
- [x] Photo upload API exists
- [x] Photo delete API exists
- [x] Admin auth endpoints exist
- [x] Admin read endpoints exist for:
  - stats
  - recent photos
  - recent guests
  - all photos
  - all guests
- [x] Event QR endpoint exists
- [ ] Operational admin APIs for handoff/export/delete flows are not complete
- [ ] Moderation workflow APIs are not complete
- [ ] Event closeout lifecycle is not fully modeled yet

---

## Master Completion Plan

Work in this order:

1. Complete client-side behavior for admin
2. Complete missing client-side behavior for guest features that are required for launch
3. Add backend operations for admin workflows
4. Connect client actions to backend
5. Add confirmation/error/success states and safety rails
6. Run end-to-end validation and cleanup

---

## Workstream A: Admin Client Completion

Goal: make the admin UI fully behave correctly before wiring every operation to the backend.

### A1. Dashboard

- [ ] Make all `View all` actions navigate to the correct admin pages or filtered states
- [ ] Decide whether dashboard cards are purely summary cards or should drill into detail
- [ ] Ensure loading, empty, and error states are distinct and polished
- [ ] Add consistent skeleton/loading behavior if desired
- [ ] Review chart labels and time framing for clarity
- [ ] Make the dashboard status language match real system behavior

### A2. Galleries

- [x] Make filter chips drive real filtered state consistently
- [-] Make `Flagged` reflect real moderation data, not placeholder logic
- [x] Make selection behavior robust:
  - select one
  - clear all
  - select all in current filter
  - preserve selection expectations during filter/search changes
- [-] Define and implement client-side behavior for:
  - `View`
  - `Export ZIP`
  - `Delete`
  - `Download all media`
- [x] Add action disabled states when nothing is selected
- [x] Add confirmation UX for destructive actions
- [x] Add visible success/error states for action completion
- [x] Make sure gallery list and card layouts stay consistent on tablets
- [ ] Decide whether galleries needs a richer preview/lightbox review state beyond the current review card

### A3. Guests

- [-] Decide whether guest bulk actions are truly needed for the product
- [x] Define correct client behavior for:
  - `Export guest list`
  - `Remove selected`
  - `View all photos`
  - `Download their album`
  - `Remove photos`
- [x] Add empty-state behavior when no guest is selected
- [x] Add empty-state behavior when a guest has no photos
- [x] Ensure filter/search and selected guest state stay in sync
- [x] Add confirmation UX for destructive guest/media actions
- [x] Add loading, success, and error states for guest actions
- [ ] Decide whether guest removal remains a real product action after workflow review

### A4. Settings

- [-] Finish interaction behavior for:
  - `Export Package`
  - `Mark Complete`
  - `Delete Media`
  - `Delete Event`
  - `Clear temporary cache`
- [x] Add prerequisite logic:
  - media deletion should not look safe before handoff is complete
  - event deletion should clearly depend on media deletion and closeout state
- [x] Add explicit warnings and irreversible-action messaging
- [x] Add confirmation dialogs or multi-step confirmations for destructive actions
- [-] Add visible operation state:
  - idle
  - running
  - failed
  - complete
- [ ] Decide whether any additional Settings actions need undo or retry behavior

### A5. Admin HCI / Accessibility Polish

- [ ] Convert any remaining fake controls into real semantic controls
- [ ] Add missing `aria-label`s where needed
- [ ] Ensure keyboard access for navigation and actions
- [ ] Ensure focus states are visible and consistent
- [ ] Review color contrast on pills, badges, and tinted buttons
- [ ] Standardize empty states, helper text, and confirmation copy
- [ ] Standardize destructive action treatment across all admin pages

### A6. Admin Code Cleanup

- [x] Replace `any` usage in `client/app/admin/page.tsx`
- [x] Decide whether to migrate admin images to `next/image`
- [x] Break up `client/app/admin/page.tsx` if it becomes too large to maintain
- [x] Extract repeated card/list/action UI into smaller admin components
- [x] Add clearer local types for admin stats, guests, and photos

---

## Workstream B: Admin Operational Backend

Goal: make the admin a real tool instead of a polished mock.

### B1. Export / Handoff

- [ ] Design the backend flow for `Prepare Client Handoff`
- [ ] Decide export format:
  - single ZIP of all media
  - ZIP + metadata manifest
  - separate guest/media manifests if needed
- [ ] Add endpoint to build/download event handoff package
- [ ] Decide whether exports are synchronous or background jobs
- [ ] Add server-side status tracking for export generation
- [ ] Reflect export history/status in admin UI

### B2. Handoff Completion

- [ ] Add backend state for `handoff pending / ready / complete`
- [ ] Add endpoint for `Mark Handoff Complete`
- [ ] Prevent misleading UI states when handoff is not complete
- [ ] Decide whether handoff completion requires a successful export first

### B3. Media Deletion / Event Closeout

- [ ] Add endpoint for `Delete Event Media`
- [ ] Add endpoint for `Delete Event Record`
- [ ] Define deletion ordering and safeguards
- [ ] Decide what metadata survives after media deletion, if any
- [ ] Add audit-safe status responses so the UI can explain what happened
- [ ] Ensure delete operations cannot be triggered accidentally

### B4. Temporary Storage / Cleanup

- [ ] Decide what `Clear temporary cache` really means
- [ ] Distinguish cached derivatives vs canonical event media
- [ ] Add backend logic for storage warning thresholds if needed
- [ ] Add real retention policy handling if `Until handoff / 24 hours / 7 days` remains visible
- [ ] Ensure cleanup logic matches the privacy-first handoff model

### B5. Moderation / Flagged Media

- [ ] Decide how media becomes `flagged`
- [ ] Add backend field/process for moderation state if placeholder-only today
- [ ] Add admin action(s) for flagged media review
- [ ] Define whether moderation is only visual tagging or actual workflow
- [ ] Ensure flagged filters in Galleries use real backend data

### B6. Guest / Gallery Operations

- [ ] Add backend support for guest list export if required
- [ ] Add backend support for guest album export if required
- [ ] Add backend support for deleting selected photos from admin
- [ ] Add backend support for deleting photos belonging to a selected guest
- [ ] Decide whether guest removal is a real product requirement

---

## Workstream C: Guest Client Completion

Goal: finish the remaining guest features that matter for the real system.

### C1. Face Blur

- [ ] Implement optional face blur before upload
- [ ] Decide whether blur is:
  - manual placement only
  - assisted detection + manual adjustment
- [ ] Ensure blur is applied before upload leaves the device
- [ ] Add clear guest explanation that blur is optional and guest-controlled
- [ ] Verify blurred output quality and export behavior

### C2. Likes

- [ ] Decide whether likes matter for launch
- [ ] If yes, add server sync for likes
- [ ] Add persistence across reloads/devices if likes remain a feature

### C3. Guest Responsive Refinements

- [ ] Implement portrait bottom sheets if still desired for upload/settings
- [ ] Add responsive sidebar width variants if still desired
- [ ] Add responsive upload panel width variants if still desired
- [ ] Re-test orientation behavior across phone and tablet sizes

### C4. Guest Polish

- [ ] Review upload progress/error/retry behavior
- [ ] Review join flow validation and duplicate-name handling
- [ ] Review download behavior on mobile devices
- [ ] Confirm guest settings labels still match current privacy model

---

## Workstream D: API / Data Model Alignment

Goal: make the system’s data model reflect the actual product rules.

- [ ] Review database schema against the current admin/guest product
- [ ] Add explicit event lifecycle state if missing
- [ ] Add explicit handoff state if missing
- [ ] Add explicit moderation state if missing
- [ ] Review whether retention settings belong in the schema
- [ ] Review whether guest/device/session data collected is actually needed
- [ ] Remove or de-emphasize fields that do not serve the real workflow

---

## Workstream E: Testing and Verification

Goal: move from “looks complete” to “safe to ship/demo”.

### E1. Admin Verification

- [ ] Test admin login/logout flow
- [ ] Test dashboard loading and empty states
- [ ] Test galleries search/filter/selection behavior
- [ ] Test guest search/filter/selection behavior
- [ ] Test settings save/discard flow
- [ ] Test all destructive confirmation flows
- [ ] Test tablet layouts:
  - iPad portrait
  - iPad landscape
  - smaller tablet / narrow laptop
- [ ] Test desktop layouts:
  - 1280px width
  - 1440px+

### E2. Guest Verification

- [ ] Test first-time join flow
- [ ] Test returning-device flow
- [ ] Test upload from camera/photo library
- [ ] Test upload progress and failure handling
- [ ] Test photo viewing and download
- [ ] Test settings toggles/labels
- [ ] Test orientation changes while using the app

### E3. End-to-End Verification

- [ ] Host event
- [ ] Join with multiple guest devices
- [ ] Upload multiple photos
- [ ] Confirm guest uploads appear in admin
- [ ] Confirm guest/media counts update as expected
- [ ] Run handoff/export flow end-to-end
- [ ] Run media deletion flow end-to-end
- [ ] Confirm post-handoff privacy behavior is correct

### E4. Code Quality

- [ ] Clear admin lint debt
- [ ] Run client build cleanly
- [ ] Run server sanity tests / smoke checks
- [ ] Add targeted tests where valuable

---

## Workstream F: Documentation

Goal: keep context accurate as the system evolves.

- [ ] Keep `handoff/README.md` in sync with actual implementation
- [ ] Update `RUNBOOK.md` with real startup and verification steps
- [ ] Update `TESTING.md` with current test workflow and known issues
- [ ] Document admin operational flows once wired:
  - export package
  - mark handoff complete
  - delete media
  - delete event
- [ ] Document privacy assumptions and post-event deletion policy
- [ ] Document any moderation workflow if `Flagged` becomes real

---

## Recommended Execution Order

### Phase 1: Finish Admin Client Behavior

- [ ] Complete all admin page interactions
- [ ] Add confirmations, disabled states, success/error states
- [ ] Clean up admin code debt enough to make future wiring easier

### Phase 2: Finish Launch-Critical Guest Features

- [ ] Decide whether face blur is launch-critical
- [ ] Finish the guest-side features that are actually required for the intended event flow

### Phase 3: Build Admin Operations Backend

- [ ] Export package
- [ ] Handoff complete state
- [ ] Delete media
- [ ] Delete event
- [ ] Moderation / flagged behavior

### Phase 4: Wire Client to Backend

- [ ] Connect admin actions to real endpoints
- [ ] Add optimistic/loading/error handling
- [ ] Validate end-to-end state transitions

### Phase 5: Hardening

- [ ] Full responsive verification
- [ ] Full HCI/accessibility verification
- [ ] Build/lint cleanup
- [ ] Documentation cleanup

---

## Immediate Next Tasks

These are the best next steps from the current state:

- [-] Finish admin client-side operational behavior for all visible actions
- [-] Add confirmation and status flows to admin destructive actions
- [x] Remove admin `any` types and clean the biggest maintainability issues in `client/app/admin/page.tsx`
- [x] Split the admin page into maintainable components before backend wiring
- [ ] Decide whether guest face blur is required before backend admin operations
- [ ] Design the backend handoff/export/delete contract before wiring admin actions
- [ ] Decide which remaining admin actions are real enough to wire first
- [ ] Start backend operational APIs for export, handoff complete, delete media, and delete event

---

## Parking Lot

Nice-to-have or non-blocking work that should not distract from making the system operational:

- [ ] Convert more admin UI into smaller reusable components
- [ ] Replace remaining admin `<img>` elements with `next/image` if worthwhile
- [ ] Add richer analytics/history in admin dashboard
- [ ] Add more advanced moderation tooling beyond a basic flagged filter
- [ ] Add deeper guest personalization features if the product ever expands
