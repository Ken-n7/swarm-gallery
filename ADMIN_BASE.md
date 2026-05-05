# Admin Base Implementation

## What changed

- Added a new server route: `GET /events/:id/qr`
  - Generates a QR code PNG for the demo event.
  - Uses `server/utils/qr.js` to create a QR pointing to the guest join page.
- Added a new client admin page at `client/app/admin/page.tsx`
  - Displays the generated QR code image.
  - Shows the guest join link for the demo event.
  - Includes a simple base admin dashboard layout.
- Registered the new events router in `server/index.js`.

## Files added/updated

- `server/utils/qr.js`
- `server/routes/events.js`
- `server/index.js`
- `client/app/admin/page.tsx`
- `ADMIN_BASE.md`

## Notes

- The QR code URL is based on `config.CLIENT_URL` if provided, otherwise it falls back to `http://localhost:3000`.
- This is a minimal admin surface; the next additions can include admin auth, live event stats, and photo controls.
