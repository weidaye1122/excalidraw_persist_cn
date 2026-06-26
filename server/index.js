const express = require("express");
const path = require("node:path");
const { mkdirSync, existsSync } = require("node:fs");
const { randomUUID, createHash, createHmac, timingSafeEqual } = require(
  "node:crypto",
);
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const BODY_LIMIT = process.env.BODY_LIMIT || "50mb";
const DB_PATH = process.env.DB_PATH || "/app/data/database.sqlite";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "";
const SESSION_SECRET =
  process.env.SESSION_SECRET || AUTH_PASSWORD || "change-this-secret";
const COOKIE_NAME = "excalidraw_session";
const COOKIE_MAX_AGE_MS = Number(
  process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30,
);
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

if (!AUTH_PASSWORD) {
  console.error(
    "Missing AUTH_PASSWORD. Set AUTH_PASSWORD before starting the server.",
  );
  process.exit(1);
}

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    elements_json TEXT NOT NULL DEFAULT '[]',
    app_state_json TEXT NOT NULL DEFAULT '{}',
    files_json TEXT NOT NULL DEFAULT '{}',
    library_items_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS boards_updated_at_idx
  ON boards(updated_at DESC);

  CREATE INDEX IF NOT EXISTS boards_deleted_at_idx
  ON boards(deleted_at);
`);

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: BODY_LIMIT }));

const frontendBuildDir = path.resolve(__dirname, "..", "excalidraw-app", "build");
const frontendIndexPath = path.join(frontendBuildDir, "index.html");
const passwordFingerprint = createHash("sha256")
  .update(AUTH_PASSWORD)
  .digest("hex")
  .slice(0, 16);

const nowIso = () => new Date().toISOString();

const isPlainObject = (value) =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);

const normalizeBoardName = (name) => {
  const trimmed = `${name || ""}`.trim();
  if (!trimmed) {
    return "Untitled board";
  }
  return trimmed.slice(0, 120);
};

const emptyScene = () => ({
  elements: [],
  appState: {},
  files: {},
  libraryItems: [],
});

const parseStoredJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const rowToBoard = (row, includeScene = false) => {
  if (!row) {
    return null;
  }

  const board = {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  };

  if (!includeScene) {
    return board;
  }

  return {
    ...board,
    elements: parseStoredJson(row.elements_json, []),
    appState: parseStoredJson(row.app_state_json, {}),
    files: parseStoredJson(row.files_json, {}),
    libraryItems: parseStoredJson(row.library_items_json, []),
  };
};

const getBoardRow = (id, includeDeleted = false) => {
  const statement = includeDeleted
    ? db.prepare("SELECT * FROM boards WHERE id = ? LIMIT 1")
    : db.prepare(
        "SELECT * FROM boards WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      );
  return statement.get(id);
};

const getBoard = (id, includeDeleted = false) =>
  rowToBoard(getBoardRow(id, includeDeleted), true);

const listBoards = (includeDeleted = false) => {
  const statement = includeDeleted
    ? db.prepare(
        "SELECT id, name, created_at, updated_at, deleted_at FROM boards ORDER BY updated_at DESC",
      )
    : db.prepare(
        "SELECT id, name, created_at, updated_at, deleted_at FROM boards WHERE deleted_at IS NULL ORDER BY updated_at DESC",
      );
  return statement.all().map((row) => rowToBoard(row));
};

const insertBoard = (name) => {
  const id = randomUUID();
  const timestamp = nowIso();
  const scene = emptyScene();

  db.prepare(
    `
      INSERT INTO boards (
        id,
        name,
        elements_json,
        app_state_json,
        files_json,
        library_items_json,
        created_at,
        updated_at,
        deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `,
  ).run(
    id,
    normalizeBoardName(name),
    JSON.stringify(scene.elements),
    JSON.stringify(scene.appState),
    JSON.stringify(scene.files),
    JSON.stringify(scene.libraryItems),
    timestamp,
    timestamp,
  );

  return getBoard(id, true);
};

const ensureAtLeastOneBoard = () => {
  const row = db
    .prepare("SELECT id FROM boards WHERE deleted_at IS NULL LIMIT 1")
    .get();
  if (!row) {
    insertBoard("Untitled board");
  }
};

ensureAtLeastOneBoard();

const hashString = (value) =>
  createHash("sha256").update(value).digest();

const passwordsMatch = (input) => {
  const expectedHash = hashString(AUTH_PASSWORD);
  const actualHash = hashString(`${input || ""}`);
  return timingSafeEqual(expectedHash, actualHash);
};

const encodeBase64Url = (value) =>
  Buffer.from(value, "utf8").toString("base64url");

const decodeBase64Url = (value) =>
  Buffer.from(value, "base64url").toString("utf8");

const signValue = (value) =>
  createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");

const createSessionToken = () => {
  const payload = encodeBase64Url(
    JSON.stringify({
      exp: Date.now() + COOKIE_MAX_AGE_MS,
      fingerprint: passwordFingerprint,
    }),
  );

  return `${payload}.${signValue(payload)}`;
};

const verifySessionToken = (token) => {
  if (!token || typeof token !== "string") {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signValue(payload);
  const actualSignature = Buffer.from(signature);
  const calculatedSignature = Buffer.from(expectedSignature);

  if (actualSignature.length !== calculatedSignature.length) {
    return false;
  }

  if (!timingSafeEqual(actualSignature, calculatedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload));
    return (
      parsed.exp > Date.now() &&
      parsed.fingerprint === passwordFingerprint
    );
  } catch (error) {
    return false;
  }
};

const parseCookies = (cookieHeader = "") =>
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return acc;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(part.slice(separatorIndex + 1));
      acc[key] = value;
      return acc;
    }, {});

const sessionCookieHeader = (value, maxAgeSeconds) => {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (COOKIE_SECURE) {
    parts.push("Secure");
  }

  return parts.join("; ");
};

const requireAuth = (request, response, next) => {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[COOKIE_NAME];

  if (!verifySessionToken(token)) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};

const normalizeScenePayload = (payload, existingBoard = emptyScene()) => {
  const elements = Array.isArray(payload?.elements)
    ? payload.elements
    : existingBoard.elements;
  const appState = isPlainObject(payload?.appState)
    ? payload.appState
    : existingBoard.appState;
  const files = isPlainObject(payload?.files)
    ? payload.files
    : existingBoard.files;
  const libraryItems = Array.isArray(payload?.libraryItems)
    ? payload.libraryItems
    : existingBoard.libraryItems;

  return {
    elements,
    appState,
    files,
    libraryItems,
  };
};

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/session", (request, response) => {
  const cookies = parseCookies(request.headers.cookie);
  response.json({
    authenticated: verifySessionToken(cookies[COOKIE_NAME]),
  });
});

app.post("/api/login", (request, response) => {
  const password = request.body?.password;

  if (!passwordsMatch(password)) {
    response.status(401).json({ error: "Invalid password" });
    return;
  }

  response.setHeader(
    "Set-Cookie",
    sessionCookieHeader(createSessionToken(), Math.floor(COOKIE_MAX_AGE_MS / 1000)),
  );
  response.json({ authenticated: true });
});

app.post("/api/logout", (_request, response) => {
  response.setHeader("Set-Cookie", sessionCookieHeader("", 0));
  response.status(204).end();
});

app.use("/api", requireAuth);

app.get("/api/boards", (request, response) => {
  const includeDeleted =
    request.query.includeDeleted === "true" ||
    request.query.includeDeleted === "1";
  response.json({ boards: listBoards(includeDeleted) });
});

app.post("/api/boards", (request, response) => {
  const board = insertBoard(request.body?.name);
  response.status(201).json({ board });
});

app.get("/api/boards/:id", (request, response) => {
  const includeDeleted =
    request.query.includeDeleted === "true" ||
    request.query.includeDeleted === "1";
  const board = getBoard(request.params.id, includeDeleted);

  if (!board || (!includeDeleted && board.deletedAt)) {
    response.status(404).json({ error: "Board not found" });
    return;
  }

  response.json({ board });
});

app.put("/api/boards/:id", (request, response) => {
  const existingBoard = getBoard(request.params.id, true);

  if (!existingBoard || existingBoard.deletedAt) {
    response.status(404).json({ error: "Board not found" });
    return;
  }

  const nextName =
    typeof request.body?.name === "string"
      ? normalizeBoardName(request.body.name)
      : existingBoard.name;
  const nextScene = normalizeScenePayload(request.body, existingBoard);
  const timestamp = nowIso();

  db.prepare(
    `
      UPDATE boards
      SET
        name = ?,
        elements_json = ?,
        app_state_json = ?,
        files_json = ?,
        library_items_json = ?,
        updated_at = ?
      WHERE id = ?
    `,
  ).run(
    nextName,
    JSON.stringify(nextScene.elements),
    JSON.stringify(nextScene.appState),
    JSON.stringify(nextScene.files),
    JSON.stringify(nextScene.libraryItems),
    timestamp,
    request.params.id,
  );

  response.json({ board: getBoard(request.params.id, true) });
});

app.delete("/api/boards/:id", (request, response) => {
  const existingBoard = getBoard(request.params.id, false);

  if (!existingBoard) {
    response.status(404).json({ error: "Board not found" });
    return;
  }

  const timestamp = nowIso();

  db.prepare(
    `
      UPDATE boards
      SET deleted_at = ?, updated_at = ?
      WHERE id = ?
    `,
  ).run(timestamp, timestamp, request.params.id);

  response.status(204).end();
});

app.post("/api/boards/:id/restore", (request, response) => {
  const existingBoard = getBoard(request.params.id, true);

  if (!existingBoard || !existingBoard.deletedAt) {
    response.status(404).json({ error: "Board not found" });
    return;
  }

  const timestamp = nowIso();
  db.prepare(
    `
      UPDATE boards
      SET deleted_at = NULL, updated_at = ?
      WHERE id = ?
    `,
  ).run(timestamp, request.params.id);

  response.json({ board: getBoard(request.params.id, true) });
});

if (existsSync(frontendBuildDir)) {
  app.use(
    express.static(frontendBuildDir, {
      index: false,
      extensions: ["html"],
    }),
  );
}

app.get("*", (_request, response) => {
  if (existsSync(frontendIndexPath)) {
    response.sendFile(frontendIndexPath);
    return;
  }

  response.status(503).json({
    error:
      "Frontend build not found. Run `pnpm build` first or start the Vite dev server separately.",
  });
});

app.listen(PORT, HOST, () => {
  console.log(
    `Excalidraw self-hosted server listening on http://${HOST}:${PORT}`,
  );
  console.log(`Using SQLite database at ${DB_PATH}`);
});
