# Excalidraw Self-Hosted Persistence

This project is a self-hosted fork rebuilt on top of the latest stable official `excalidraw/excalidraw` release, `v0.18.1`.

It keeps the current official Excalidraw editor UI and drawing capabilities, while replacing the cloud wrapper with a private deployment flow:

- password login
- multiple boards
- manual save to SQLite
- local SQLite file path via `DB_PATH`
- no Excalidraw cloud services
- no third-party cloud persistence
- no board uploads to external servers

## What Changed

The editor itself still comes from the official Excalidraw source in this repository.

The self-hosted layer adds:

- a local Node server
- cookie-based password authentication
- SQLite-backed board storage
- board list / create / rename / delete / restore
- a manual `Save board` action
- Docker deployment with `/app/data` volume persistence

## Board Model

Each board persists the following shape on the server:

```json
{
  "id": "uuid",
  "name": "Board name",
  "elements": [],
  "appState": {},
  "files": {},
  "libraryItems": [],
  "createdAt": "2026-06-26T11:35:17.402Z",
  "updatedAt": "2026-06-26T11:35:17.402Z"
}
```

Soft delete is supported through `deletedAt`.

## Environment Variables

Copy `.env.example` and adjust values as needed.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `AUTH_PASSWORD` | Yes | none | Login password for the private deployment |
| `SESSION_SECRET` | Recommended | falls back to `AUTH_PASSWORD` | Used to sign the session cookie |
| `DB_PATH` | No | `/app/data/database.sqlite` | SQLite file path |
| `PORT` | No | `3000` | HTTP port |
| `HOST` | No | `0.0.0.0` | Bind address |
| `COOKIE_SECURE` | No | `false` | Set to `true` when serving over HTTPS |
| `BODY_LIMIT` | No | `50mb` | API JSON body limit for large boards / embedded files |

## Docker

Build and run:

```bash
docker compose up -d --build
```

Important:

- map `/app/data` to the host
- keep `DB_PATH=/app/data/database.sqlite`
- set a strong `AUTH_PASSWORD`
- set a separate `SESSION_SECRET`

The included `docker-compose.yml` already mounts:

```text
./data:/app/data
```

That means deleting or recreating the container will not remove your boards as long as the host `./data` folder remains.

## Publish To GitHub Container Registry

This repository includes GitHub Actions workflows for container build and publish.

- pushes to `main` or `master` publish `ghcr.io/<owner>/<repo>:latest`
- pushes to `codex/**` publish branch-tagged preview images
- version tags like `v1.0.0` publish matching tag images
- manual publish is available through `workflow_dispatch`

To use it:

1. Push this codebase to your own GitHub repository.
2. Open the repository `Actions` tab and allow workflows if GitHub asks.
3. Push to the default branch, or trigger `Publish Container` manually.
4. Pull the image from GHCR:

```bash
docker pull ghcr.io/<owner>/<repo>:latest
```

If the GitHub repository or package is private, log in first:

```bash
docker login ghcr.io
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the API server:

```bash
AUTH_PASSWORD=change-me SESSION_SECRET=change-me pnpm dev:server
```

Start the Vite frontend:

```bash
pnpm dev
```

The frontend proxies `/api` to `http://localhost:3001`.

## Production Start

Build the frontend:

```bash
pnpm build
```

Run the server:

```bash
AUTH_PASSWORD=change-me SESSION_SECRET=change-me pnpm start
```

## Notes

- `Ctrl/Cmd+S` saves the active board to SQLite.
- Import/export `.excalidraw` files still uses the official Excalidraw editor actions.
- The app intentionally removes cloud redirects, analytics, and external persistence hooks from the official web wrapper.
