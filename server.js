const { createServer } = require("node:http");
const { readFileSync, existsSync, mkdirSync } = require("node:fs");
const { extname, join, normalize } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const root = __dirname;
const dataDir = join(root, "data");
const port = Number(process.env.PORT || 4173);
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseBucket = process.env.SUPABASE_BUCKET || "pyeongtaek-stitch";
const useSupabase = Boolean(supabaseUrl && supabaseKey);

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

function storagePath(kind, cell) {
  return `${kind}/${cell.patternId}/${cell.row}-${cell.col}${kind === "photos" ? ".jpg" : ".json"}`;
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl || "");
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

function bufferToDataUrl(buffer, contentType) {
  return `data:${contentType || "image/jpeg"};base64,${Buffer.from(buffer).toString("base64")}`;
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return Buffer.from(await response.arrayBuffer());
}

async function ensureSupabaseBucket() {
  if (!useSupabase) return;
  try {
    await supabaseRequest(`/storage/v1/bucket/${encodeURIComponent(supabaseBucket)}`);
  } catch {
    await supabaseRequest("/storage/v1/bucket", {
      method: "POST",
      body: JSON.stringify({ id: supabaseBucket, name: supabaseBucket, public: false })
    });
  }
}

async function uploadSupabaseObject(path, body, contentType) {
  await supabaseRequest(`/storage/v1/object/${encodeURIComponent(supabaseBucket)}/${path}`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": contentType,
      "x-upsert": "true"
    }
  });
}

async function deleteSupabaseObjects(paths) {
  await supabaseRequest(`/storage/v1/object/${encodeURIComponent(supabaseBucket)}`, {
    method: "DELETE",
    body: JSON.stringify({ prefixes: paths })
  });
}

async function listSupabaseObjects(prefix) {
  return supabaseRequest(`/storage/v1/object/list/${encodeURIComponent(supabaseBucket)}`, {
    method: "POST",
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } })
  });
}

async function downloadSupabaseObject(path) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(supabaseBucket)}/${path}`, {
    headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey }
  });
  if (!response.ok) throw new Error(`Supabase download ${response.status}`);
  return {
    contentType: response.headers.get("content-type") || "application/octet-stream",
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

async function saveCellSupabase(cell, updatedAt) {
  await ensureSupabaseBucket();
  const photo = dataUrlToBuffer(cell.dataUrl);
  const record = {
    key: cell.key,
    patternId: cell.patternId,
    row: cell.row,
    col: cell.col,
    thread: cell.thread,
    symbol: cell.symbol,
    color: cell.color || null,
    hex: cell.hex || null,
    stitched: Boolean(cell.stitched),
    updatedAt,
    photoPath: photo ? storagePath("photos", cell) : null
  };
  if (photo) await uploadSupabaseObject(record.photoPath, photo.buffer, photo.contentType);
  await uploadSupabaseObject(storagePath("cells", cell), JSON.stringify(record), "application/json; charset=utf-8");
}

async function loadPatternSupabase(patternId) {
  await ensureSupabaseBucket();
  const objects = await listSupabaseObjects(`cells/${patternId}`);
  const cells = [];
  for (const item of objects || []) {
    if (!item.name.endsWith(".json")) continue;
    const metaPath = `cells/${patternId}/${item.name}`;
    const metaFile = await downloadSupabaseObject(metaPath);
    const cell = JSON.parse(metaFile.buffer.toString("utf8"));
    if (cell.photoPath) {
      try {
        const photo = await downloadSupabaseObject(cell.photoPath);
        cell.dataUrl = bufferToDataUrl(photo.buffer, photo.contentType);
      } catch {
        cell.dataUrl = null;
      }
    } else {
      cell.dataUrl = null;
    }
    cells.push(cell);
  }
  return cells.sort((a, b) => (a.row - b.row) || (a.col - b.col));
}

async function countsSupabase() {
  await ensureSupabaseBucket();
  const counts = [];
  for (const patternId of ["agri", "baedari", "sopung", "oseong", "wonpyeong", "jinwi", "port", "lake"]) {
    const objects = await listSupabaseObjects(`photos/${patternId}`);
    counts.push({ patternId, count: (objects || []).filter((item) => item.name.endsWith(".jpg")).length });
  }
  return counts;
}

async function patchCellSupabase(key, body, updatedAt) {
  await ensureSupabaseBucket();
  const cell = { ...body, key, updatedAt };
  try {
    const metaFile = await downloadSupabaseObject(storagePath("cells", cell));
    Object.assign(cell, JSON.parse(metaFile.buffer.toString("utf8")), body, { key, updatedAt });
  } catch {
    // A stitched-only cell can exist before a photo is uploaded.
  }
  await uploadSupabaseObject(storagePath("cells", cell), JSON.stringify(cell), "application/json; charset=utf-8");
}

async function deleteCellSupabase(cell) {
  await ensureSupabaseBucket();
  await deleteSupabaseObjects([storagePath("cells", cell), storagePath("photos", cell)]);
}

async function resetSupabase() {
  await ensureSupabaseBucket();
  const paths = [];
  for (const rootPrefix of ["cells", "photos"]) {
    for (const patternId of ["agri", "baedari", "sopung", "oseong", "wonpyeong", "jinwi", "port", "lake"]) {
      const objects = await listSupabaseObjects(`${rootPrefix}/${patternId}`);
      (objects || []).forEach((item) => paths.push(`${rootPrefix}/${patternId}/${item.name}`));
    }
  }
  if (!paths.length) return;
  for (let index = 0; index < paths.length; index += 100) {
    await deleteSupabaseObjects(paths.slice(index, index + 100));
  }
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
    sendJson(res, 200, { ok: true, storage: useSupabase ? "supabase" : "sqlite" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/counts") {
    if (useSupabase) {
      sendJson(res, 200, { counts: await countsSupabase() });
      return;
    }
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
    if (useSupabase) {
      sendJson(res, 200, { cells: await loadPatternSupabase(patternId) });
      return;
    }
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
    if (useSupabase) {
      await saveCellSupabase(cell, updatedAt);
      sendJson(res, 200, { ok: true, updatedAt });
      return;
    }
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
    if (useSupabase) {
      await resetSupabase();
      sendJson(res, 200, { ok: true });
      return;
    }
    db.prepare("DELETE FROM cells").run();
    sendJson(res, 200, { ok: true });
    return;
  }

  const cellMatch = url.pathname.match(/^\/api\/cells\/(.+)$/);
  if (cellMatch && req.method === "PATCH") {
    const key = decodeURIComponent(cellMatch[1]);
    const body = await readJson(req);
    const updatedAt = new Date().toISOString();
    if (useSupabase) {
      await patchCellSupabase(key, body, updatedAt);
      sendJson(res, 200, { ok: true, updatedAt });
      return;
    }
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
    if (useSupabase) {
      await deleteCellSupabase({ ...parseCellPathKey(key), key });
      sendJson(res, 200, { ok: true });
      return;
    }
    db.prepare("DELETE FROM cells WHERE key = ?").run(key);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

function parseCellPathKey(key) {
  const [patternId, position = "0-0"] = key.split(":");
  const [row, col] = position.split("-").map(Number);
  return { patternId, row, col };
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
