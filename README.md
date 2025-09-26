# URL Shortener

Tiny URL shortener with **Express + SQLite** (backend) and **HTML/CSS/JS** (frontend).  
Short links display as `https://short.link/<code>`.

## Features
- Create short links with TTL: `1m`, `5m`, `30m`, `1h`, `5h`
- Redirect `/:code` → original URL
- Click counter & delete button
- QR button encodes the original long URL

## Prerequisites
- Node.js 18+

## Project Structure
    back/   # Express API + SQLite DB (auto-created on first run)
    front/  # index.html, script.js, style.css

## Run Locally

### 1) Start the API
    cd back
    npm install
    node server.js
    # API → http://localhost:3000

### 2) Open the Frontend
    npx http-server front -p 5173
    # Site → http://localhost:5173
    # (or open front/index.html directly in your browser)

### 3) Frontend Config (dev)
Edit `front/script.js` and set:
    const API_BASE = "http://localhost:3000"; // where the API runs
    const PUBLIC_BASE = "https://short.link"; // how short links are displayed
Notes:
- In dev, clicking a link opens `http://localhost:3000/<code>` so redirects work locally.
- In prod, set both to your domain 

## API
- POST `/shorten` — body: `{ "url": "<longUrl>", "ttl": "1m|5m|30m|1h|5h" }`
- GET  `/links` — list active links
- DELETE `/links/:code` — soft delete
- GET  `/:code` — redirect + increment click count

## Notes
- SQLite DB is created at `back/data.db` on first run.
- To test on a phone before deploy, use your PC’s LAN IP or a tunnel (e.g., ngrok).

