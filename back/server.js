const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE", "OPTIONS"] }));
app.use(express.json());

const BASE_URL = "https://short.link";
const DB_PATH = path.join(__dirname, "data.db");

const db = new Database(DB_PATH);
db.prepare(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    click_count INTEGER DEFAULT 0,
    deleted_at DATETIME
  )
`).run();

function ttlToMs(ttl) {
  const map = { "1m": 60_000, "5m": 5*60_000, "30m": 30*60_000, "1h": 60*60_000, "5h": 5*60*60_000 };
  return map[ttl] ?? null;
}
const ALPHABETNUMS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function randomCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABETNUMS[bytes[i] % ALPHABETNUMS.length];
  return out;
}

function isValidUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

app.post("/shorten", (req, res) => {
  const { url, ttl } = req.body || {};
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL. Must start with http(s)://" });
  }
  const ms = ttlToMs(ttl);
  if (!ms) {
    return res.status(400).json({ error: "Missing expiration (ttl)." });
  }

  const expiresAt = new Date(Date.now() + ms).toISOString();
  const insert = db.prepare("INSERT INTO links (code, original_url, expires_at) VALUES (?, ?, ?)");
  let code = "";

  for (let i = 0; i < 5; i++) {
    code = randomCode(7);
    try {
      insert.run(code, url, expiresAt);
      break;
    } catch (e) {
      if (e.code === "SQLITE_CONSTRAINT_UNIQUE") continue; 
      return res.status(500).json({ error: "Database error" });
    }
  }
  if (!code) return res.status(500).json({ error: "Could not generate unique code" });

  const shortUrl = `${BASE_URL}/${code}`;
  return res.status(201).json({ shortUrl, code, expiresAt });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/debug/links", (_req, res) => {
  const rows = db.prepare(`
    SELECT id, code, original_url, click_count, expires_at, created_at, deleted_at
    FROM links
    ORDER BY created_at DESC
  `).all();
  res.json(rows);
});

app.get("/links", (_req, res) => {
  const rows = db.prepare(`
    SELECT code, original_url, click_count, expires_at, created_at
    FROM links
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `).all().map(r => ({
    ...r,
    shortUrl: `${BASE_URL}/${r.code}`,  
  }));
  res.json(rows);
});


app.delete("/links/:code", (req, res) => {
  const code = (req.params.code || "").trim();
  console.log("DELETE request for code:", code);

  const info = db.prepare(`
    UPDATE links
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE code = ? AND deleted_at IS NULL
  `).run(code);

  if (info.changes > 0) return res.status(200).json({ ok: true, code });
  return res.status(404).json({ error: "Not found", code });
});

app.get("/:code", (req, res) => {
  const { code } = req.params;

  const row = db.prepare(`
    SELECT original_url, expires_at, deleted_at
    FROM links
    WHERE code = ?
  `).get(code);

  if (!row || row.deleted_at) return res.status(404).send("Short link not found");

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return res.status(404).send("Short link expired");
  }

  db.prepare("UPDATE links SET click_count = click_count + 1 WHERE code = ?").run(code);
  res.redirect(row.original_url);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
