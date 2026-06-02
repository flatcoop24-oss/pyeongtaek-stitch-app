const { createServer } = require("node:http");
const { readFileSync, existsSync, mkdirSync } = require("node:fs");
const { extname, join, normalize } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const root = __dirname;
const dataDir = join(root, "data");
const port = Number(process.env.PORT || 4173);

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "pyeongtaek-stitch.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS cells (
    key TEXT PRIMARY KEY,
    pattern_id TEXT NOT NULL,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    thread TEXT NOT NULL,
    symbol TEXT NOT NULL,
    color TEXT,
    hex TEXT,
    data_url TEXT,
    stitched INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cells_pattern ON cells(pattern_id);
`);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function safePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const target = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(root, target));
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/counts") {
    const rows = db.prepare(`
      SELECT pattern_id AS patternId, COUNT(*) AS count
      FROM cells
      WHERE data_url IS NOT NULL AND data_url != ''
      GROUP BY pattern_id
    `).all();
    sendJson(res, 200, { counts: rows });
    return;
  }

  const patternMatch = url.pathname.match(/^\/api\/patterns\/([^/]+)\/cells$/);
  if (req.method === "GET" && patternMatch) {
    const patternId = patternMatch[1];
    const cells = db.prepare(`
      SELECT key, pattern_id AS patternId, row, col, thread, symbol, color, hex, data_url AS dataUrl,
        stitched, updated_at AS updatedAt
      FROM cells
      WHERE pattern_id = ?
      ORDER BY row, col
    `).all(patternId).map((cell) => ({ ...cell, stitched: Boolean(cell.stitched) }));
    sendJson(res, 200, { cells });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/cells") {
    const cell = await readJson(req);
    const required = ["key", "patternId", "row", "col", "thread", "symbol"];
    if (!required.every((field) => cell[field] !== undefined && cell[field] !== null)) {
      sendJson(res, 400, { error: "Missing required cell fields" });
      return;
    }
    const updatedAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO cells (key, pattern_id, row, col, thread, symbol, color, hex, data_url, stitched, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        pattern_id = excluded.pattern_id,
        row = excluded.row,
        col = excluded.col,
        thread = excluded.thread,
        symbol = excluded.symbol,
        color = excluded.color,
        hex = excluded.hex,
        data_url = excluded.data_url,
        stitched = excluded.stitched,
        updated_at = excluded.updated_at
    `).run(
      cell.key,
      cell.patternId,
      cell.row,
      cell.col,
      cell.thread,
      cell.symbol,
      cell.color || null,
      cell.hex || null,
      cell.dataUrl || null,
      cell.stitched ? 1 : 0,
      updatedAt
    );
    sendJson(res, 200, { ok: true, updatedAt });
    return;
  }

  if (req.method === "DELETE" && url.pathname === "/api/cells") {
    db.prepare("DELETE FROM cells").run();
    sendJson(res, 200, { ok: true });
    return;
  }

  const cellMatch = url.pathname.match(/^\/api\/cells\/(.+)$/);
  if (cellMatch && req.method === "PATCH") {
    const key = decodeURIComponent(cellMatch[1]);
    const body = await readJson(req);
    const updatedAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO cells (key, pattern_id, row, col, thread, symbol, stitched, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET stitched = excluded.stitched, updated_at = excluded.updated_at
    `).run(key, body.patternId, body.row, body.col, body.thread, body.symbol, body.stitched ? 1 : 0, updatedAt);
    sendJson(res, 200, { ok: true, updatedAt });
    return;
  }

  if (cellMatch && req.method === "DELETE") {
    const key = decodeURIComponent(cellMatch[1]);
    db.prepare("DELETE FROM cells WHERE key = ?").run(key);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    const filePath = safePath(req.url);
    if (!filePath || !existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
    res.end(readFileSync(filePath));
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Pyeongtaek stitch app running at http://0.0.0.0:${port}`);
});
