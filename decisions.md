# Decision Log

A record of key technical decisions made during the build, and the reasoning behind each.

---

## 1. Database — Supabase (PostgreSQL) via TypeORM

**Decision:** Use Supabase as the managed PostgreSQL database with TypeORM as the ORM.

**Why:**
- Supabase is fully managed — no server to set up, has a free tier, and includes a dashboard to browse data directly
- TypeORM lets us define tables as TypeScript classes (entities) instead of writing raw SQL
- The `pg` driver is the standard Node.js connector for PostgreSQL

**Trade-off:** `synchronize: true` auto-creates tables in dev which is convenient but must be replaced with migrations before going to production to avoid accidental schema changes.

---

## 2. File Uploads — Multer (memoryStorage) → Supabase Storage

**Decision:** Use Multer with `memoryStorage` to handle image uploads, then stream the buffer directly to Supabase Storage.

**Why:**
- `memoryStorage` keeps the file as a buffer in memory — never writes to disk
- Supabase Storage acts as a CDN and returns a permanent public URL
- That URL is stored in the DB, keeping the API server stateless
- No local files to worry about across restarts or deployments

**Trade-off:** Large files held in memory increase RAM usage. Mitigated by the 2 MB per image limit.

---

## 3. Image Size Limit — 2 MB

**Decision:** Cap image uploads at 2 MB per file.

**Why:**
- Supabase free tier has a 50 MB global storage limit
- 2 MB × 25 beers = 50 MB — fits the limit comfortably for a test app
- 2 MB is plenty for a compressed beer label photo

**Trade-off:** May need to increase for production if higher-resolution images are required.

---

## 4. Temperature Generation — Random 0–7°C

**Decision:** Generate a random temperature between 0–7°C on every read instead of integrating real sensors.

**Why:**
- The exercise specifies random temperature generation as a placeholder
- Keeps the architecture clean — a real sensor integration would only need to replace `recordReading()` in `TemperatureReadingsService`

**Real sensor path:** Each sensor would push readings to a dedicated `POST /beers/:id/temperature` endpoint. For high-frequency sensors a message queue (MQTT/SQS) would sit between the sensor and the API to absorb bursts.

---

## 5. Authentication — API Key → JWT

**Decision:** Clients exchange a pre-shared API key for a 24-hour JWT via `POST /auth/token`. All `/beers` endpoints require a valid Bearer token.

**Why:**
- Simple machine-to-machine auth pattern suitable for a mobile/web app polling an API
- JWT is stateless — the server doesn't need to store sessions
- 24-hour expiry balances security and convenience for a test app

**Trade-off:** No token refresh endpoint — clients must re-request a token after 24 hours. A `POST /auth/refresh` would improve this.

---

## 6. Parallel Temperature Reads — Promise.all

**Decision:** On `GET /beers`, fire all temperature recording operations concurrently using `Promise.all`.

**Why:**
- The dashboard polls frequently and multiple clients hit the endpoint simultaneously
- Sequential reads would make response time grow linearly with the number of beers
- `Promise.all` keeps total wait time ≈ one DB round-trip regardless of fleet size

**Trade-off:** All DB writes happen simultaneously — acceptable at this scale, but a queue or batch insert would be better at high volume.

---

## 7. Global Exception Filter

**Decision:** Add a global `AllExceptionsFilter` that catches all unhandled exceptions.

**Why:**
- Without it, unexpected errors (DB drops, runtime crashes) expose raw stack traces to clients
- Ensures all error responses follow a consistent `{ statusCode, message, path, timestamp }` shape
- Full stack traces are logged server-side only — nothing leaks to the client

---

## 8. Helmet

**Decision:** Add Helmet to set HTTP security headers on every response.

**Why:**
- One line of code that removes `X-Powered-By` and adds several protective headers
- Prevents common browser-based attacks (clickjacking, MIME sniffing)
- Good practice even for a test app — signals security awareness

---

## 9. Logging — NestJS Built-in Logger (no client data)

**Decision:** Use NestJS's built-in `Logger` class across all services. Never log client-supplied data.

**Why:**
- Built-in Logger matches NestJS's own output format — consistent terminal output
- Logging operation outcomes (IDs, counts, flags) without logging names, temperatures, or image URLs prevents accidental data exposure in logs

---

## 10. CORS — Enabled Globally

**Decision:** Enable CORS globally via `app.enableCors()`.

**Why:**
- The frontend (mobile/web) runs on a different origin than the API
- Without CORS, browsers block requests from the frontend entirely
- Global enable is appropriate here since the API is purpose-built for a known frontend
