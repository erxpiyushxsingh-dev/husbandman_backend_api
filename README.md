# AgriOS API — Backend Foundation

Node.js + Express + TypeScript + PostgreSQL. This is the **base structure**:
security, config, error handling, and the **auth module** — built to be a
reusable foundation you copy the pattern from for every future module
(inventory, sales, purchases, etc.), not just AgriOS-specific code.

## Stack

- **Express** on **TypeScript**
- **PostgreSQL** via `pg` — raw parameterized SQL, no ORM (repository pattern)
- **JWT** access + refresh tokens (refresh token rotation + reuse detection)
- **bcrypt** password hashing, **Zod** validation, **Winston** logging

## Folder structure

```
src/
  config/          env validation, DB pool, logger
  common/
    middlewares/   errorHandler, authenticate, authorize, rateLimiter,
                    validateRequest, requestLogger
    utils/         ApiError, ApiResponse, asyncHandler, jwt, password, ms
  database/
    migrations/    plain .sql files, applied in filename order
    migrate.ts      tiny migration runner (npm run migrate)
  modules/
    auth/          routes -> controller -> service -> repository
    users/         reference pattern — copy this shape for new modules
  app.ts           security middleware + route wiring
  server.ts        entrypoint, graceful shutdown
```

**Adding a new module** (e.g. `products`): create
`modules/products/{products.routes,controller,service,repository,validators,types}.ts`
following the `users` module. Register the router in `app.ts`.

## Security measures in place

- `helmet` security headers, strict CORS (only `CORS_ORIGINS` origins, credentials allowed)
- Body size limits (10kb) to blunt payload-based DoS
- `hpp` (HTTP parameter pollution) protection
- Global rate limiting + a stricter limiter on `/auth/*` (brute-force protection)
- Passwords hashed with bcrypt (12 salt rounds, configurable)
- Account lockout after 5 failed logins (15 min), enforced server-side
- JWT access tokens (15 min) + refresh tokens (7 days, httpOnly/secure/sameSite=strict cookie)
- Refresh tokens stored **hashed** in DB, rotated on every use, with reuse
  detection (a replayed old token revokes all sessions for that user)
- All SQL is parameterized (`$1, $2, ...`) — no string-built queries anywhere
- Centralized error handler — stack traces/internal messages never leak in production
- Environment variables validated at boot (`zod`) — the app refuses to start misconfigured
- Generic "Invalid email or password" on login failures — never reveals whether the email exists

## Setup

```bash
npm install
cp .env.example .env   # fill in real values; DB_USER/DB_PASSWORD for your local Postgres
npm run migrate        # applies SQL files in src/database/migrations
npm run dev             # starts on http://localhost:4000
```

Health check: `GET /health` (unauthenticated).

## API (base: `/api/v1`)

| Module | Routes | Notes |
|---|---|---|
| `/auth` | register, login, refresh, logout, me, change-password | see above |
| `/users` | GET | owner/admin only, reference pattern |
| `/categories` | full CRUD | simple lookup table |
| `/suppliers` | full CRUD | simple lookup table |
| `/branches` | full CRUD | write restricted to owner/admin |
| `/inventory` | full CRUD + `PATCH /:id/adjust-stock` | `stockStatus` is always server-computed from `stock` (thresholds in `inventory.repository.ts`), never client-settable. `adjust-stock` is atomic (row-locked) and rejects negative results |
| `/transactions` | full CRUD | `POST` accepts optional `inventoryItemId` + `quantity` — sale deducts stock, purchase adds it, in the **same DB transaction** as the ledger row. A failed stock check rolls back the whole request |
| `/farmers` | full CRUD | |
| `/employees` | full CRUD + nested `/:employeeId/attendance` (GET, POST) | |
| `/warehouses` | full CRUD | |
| `/stock-transfers` | full CRUD | API fields `from`/`to` map to DB columns `from_location`/`to_location` |
| `/expenses` | full CRUD | |
| `/finance/summary` | GET | computed live from `transactions` + `expenses` (owner/admin/manager) |
| `/dashboard/summary` | GET | computed live from `transactions`, `inventory`, `farmers` |
| `/reports` | full CRUD | note: exposes `updatedAt`, not `updated` — see Frontend integration below |
| `/knowledge-docs` | full CRUD | |
| `/ai-messages` | GET (history), POST (send) | scoped to the logged-in user; bot reply is a placeholder — wire a real provider in `aiMessages.service.ts` |
| `/notification-settings` | full CRUD | any authenticated user can toggle |

All list endpoints accept `?page=&limit=` (default 20, max 100) and return
`{ items, total, page, limit }`. All responses use one envelope:
`{ success, message, data }` on success, `{ success: false, message, errors? }`
on failure. Every write endpoint (`POST`/`PUT`/`DELETE`) requires a Bearer
token; most also gate by role via `authorize(...)` — check each router file
for exact roles.

## Frontend integration

- Set `VITE_API_BASE_URL=http://localhost:4000/api/v1` in the frontend `.env`
  (the frontend currently points at a json-server mock over `db.json` —
  replace each feature's `*Service.ts` to call these real endpoints instead).
- CORS is locked to `CORS_ORIGINS` in `.env` — add the frontend's dev/prod
  origin(s) there.
- Access token: send as `Authorization: Bearer <token>` on every request.
- On a 401, call `POST /auth/refresh` (cookie-based, no body needed) to get
  a new access token, then retry the original request once.
- **Response shape differs from `db.json`**: every list endpoint now returns
  `{ items, total, page, limit }` instead of a bare array, and single-item
  responses are wrapped as `{ item: {...} }`. Update each feature's service
  file to read `res.data.items` / `res.data.item` accordingly.
- **Field-name notes**: `reports` exposes `updatedAt` (a real timestamp,
  server-maintained) rather than `db.json`'s free-text `updated` string.
  Everything else matches `src/types/domain.ts` in the frontend exactly
  (camelCase in, camelCase out — the API converts to/from snake_case
  internally, see `common/utils/caseMapper.ts`).
- `dashboardSummary` and `financeSummary` are no longer static JSON blobs —
  they're computed live from `transactions`/`inventory`/`farmers`/`expenses`,
  so seed some real records before expecting a populated dashboard.

## AI Assistant (chatbot) setup

`/ai-messages` is wired to a real AI provider — configurable via `AI_PROVIDER`
in `.env` (`openrouter` | `openai` | `anthropic`), implemented in
`src/modules/ai-assistant/aiProvider.ts`. Only the key for the active
provider needs to be set; the others can stay blank.

- **Currently configured: OpenRouter**, model `openai/gpt-4o-mini` (cheap,
  fast, good enough for a business chatbot — change `OPENROUTER_MODEL` to
  any model slug from openrouter.ai/models to switch, e.g.
  `anthropic/claude-3.5-sonnet` for a stronger but pricier model).
- Each reply is generated with the last 20 messages of that user's
  conversation as context, so the assistant remembers what was just said.
- **Responses are English-only for now** (enforced via the system prompt in
  `aiProvider.ts`) — Hindi support is a planned follow-up.
- If the AI provider call fails (bad key, rate limit, network issue), the
  user still gets a friendly "having trouble reaching the AI service"
  message instead of a broken request — the error is logged server-side
  (`logger.error("AI provider call failed", ...)`) so you can debug it.
- **This sandbox's network doesn't allow api calls out to openrouter.ai /
  api.openai.com / api.anthropic.com**, so the live model call itself
  couldn't be tested from here — I did verify the full pipeline (auth,
  message persistence, conversation history, and the graceful-failure path)
  end-to-end against a real Postgres instance. Test the live reply once you
  run this on a machine with normal internet access — if the key/model is
  wrong you'll see the actual provider error in the server log immediately.

## What's next

This ships auth, the shared foundation, AND all business CRUD modules
matching the frontend's feature set (categories, suppliers, inventory,
transactions, farmers, employees + attendance, warehouses, stock-transfers,
expenses, finance/dashboard summaries, reports, knowledge-docs, ai-messages,
notification-settings). What's left is largely frontend-side: swapping each
feature's service file from the json-server mock to these real endpoints,
and deciding on real auth/session handling in `authSlice.ts`.
