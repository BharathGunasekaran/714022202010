
# URL Shortener - Backend

This is a minimal Node.js + Express microservice implementing the assessment API endpoints.

Run:
1. cd backend
2. npm install
3. npm start

Endpoints:
- POST /shorturls        (create short URL)  { url, validity (minutes, optional), shortcode (optional) }
- GET  /shorturls        (list all short URLs)
- GET  /shorturls/:sc    (get statistics for shortcode)
- GET  /:shortcode       (redirect to original URL and record click)

Logs are written to `logs.jsonl` by a custom logging middleware (no `console.log` usage required by assessment).
Data is persisted in `db.json` in the backend folder.
