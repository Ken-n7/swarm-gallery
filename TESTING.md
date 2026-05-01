# Swarm Gallery — Testing Plan

## Quick smoke test (run after every change)

```bash
# Terminal 1 — server
cd server && node index.js

# Terminal 2 — client
cd client && npm run build && npm start -- -H 0.0.0.0
```

Then hit each endpoint below and check all return expected values.

---

## Server API tests

```bash
# Health
curl http://localhost:4000/health
# expect: {"ok":true}

# Join (new user)
curl -s -X POST http://localhost:4000/users/join \
  -F "username=TestUser" -F "eventId=demo"
# expect: { userId, username: "TestUser", avatarUrl: null }

# Upload photo (needs a real image file)
curl -s -X POST http://localhost:4000/upload/demo \
  -F "username=TestUser" \
  -F "photo=@/path/to/photo.jpg;type=image/jpeg"
# expect: { id, filename, url, uploadedAt, uploader: "TestUser" }

# List photos
curl http://localhost:4000/photos-list/demo
# expect: array of photo objects

# Serve a photo (use filename from upload response)
curl -I http://localhost:4000/photos/demo/<filename>
# expect: HTTP 200

# Admin login
curl -s -X POST http://localhost:4000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'
# expect: {"ok":true}

# Admin login — wrong password
curl -s -X POST http://localhost:4000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}'
# expect: {"error":"Wrong password"} with HTTP 401

# Socket.IO handshake
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:4000/socket.io/?EIO=4&transport=polling"
# expect: 200
```

---

## Client page tests

```bash
for path in "/" "/event/demo" "/event/demo/upload" "/event/demo/settings"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$code  $path"
done
# expect: 200 for all
```

---

## Manual UI tests (do on phone + desktop)

### Join flow
- [ ] Open `/event/demo` → JoinScreen shows
- [ ] Enter nickname → tap "Join" → gallery loads
- [ ] Refresh tab → gallery loads directly (localStorage rejoin)

### Gallery
- [ ] Photos grouped by uploader
- [ ] Filter tabs work (All / Recent / Mine / Top Liked)
- [ ] Portrait: bottom nav visible (Gallery/Upload/Settings)
- [ ] Portrait: hamburger → dark sidebar drawer slides in
- [ ] Landscape: sidebar fixed left + upload panel fixed right
- [ ] Tap photo group → PhotoViewer opens
- [ ] PhotoViewer: swipe/arrow nav works, heart toggle, download link

### Upload
- [ ] Tap Upload tab → upload page loads
- [ ] Take photo / Import from gallery → preview shows
- [ ] Tap "Upload to gallery" → returns to gallery, photo appears live on all devices

### Settings
- [ ] Tap Settings tab → settings page loads
- [ ] Toggles respond (UI only for now)
- [ ] "Leave Event" → clears localStorage → JoinScreen

### Real-time (two devices)
- [ ] Upload from Device A → appears on Device B within ~1s
- [ ] Live counter increments when new device joins

---

## Future: automated tests to write

### Server (Jest + supertest)
- `POST /users/join` — new user created
- `POST /users/join` — existing userId returns same user (rejoin)
- `POST /upload/:eventId` — file saved, photo record in DB
- `POST /upload/:eventId` — rejects non-image mimetype
- `POST /upload/:eventId` — rejects file > MAX_FILE_SIZE
- `GET /photos-list/:eventId` — returns only photos for that event
- `POST /admin/login` — correct password sets cookie
- `POST /admin/login` — wrong password returns 401
- `GET /admin/me` — returns 401 without cookie, 200 with

### Client (Playwright or Cypress, e2e)
- Full join → upload → gallery update flow on two browser contexts
- Landscape layout renders sidebar + upload panel
- Portrait layout renders bottom nav + drawer
- PhotoViewer keyboard nav (ArrowLeft/Right/Escape)
- Like button toggles state
