# Beer Monitoring API

NestJS + TypeScript backend for a craft brewery mobile app that monitors refrigerated beer container temperatures on delivery trucks.

## Tech Stack

- **NestJS** (v11) with TypeScript
- **Supabase** (PostgreSQL) via TypeORM
- **Supabase Storage** — image uploads via Multer memory buffer → `beer-images` bucket
- **class-validator** — DTO validation

## Getting Started

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your Supabase connection details:

```bash
cp .env.example .env
```

Find your DB credentials in Supabase Dashboard → Project Settings → Database → Connection parameters.

```env
PORT=3000

# Supabase PostgreSQL connection (use Connection Pooling values)
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.<your-project-ref>
DB_PASSWORD=<your-db-password>
DB_NAME=postgres
DB_SSL=true

# Supabase Storage (Dashboard → Settings → API)
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Auth
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
API_KEY=<generate: node -e "console.log(require('crypto').randomBytes(24).toString('base64'))">
```

### 4. Run

```bash
npm run start:dev
```

Tables are auto-created via TypeORM `synchronize: true`.

> **Supabase Storage setup (one-time):** In your Supabase project go to Storage → New bucket → name: `beer-images` → enable **Public bucket**.

---

## API Endpoints

### `POST /auth/token`
Exchange your API key for a JWT. The returned token must be sent as a `Authorization: Bearer <token>` header on all `/beers` requests.

**Request body (`application/json`):**
```json
{ "apiKey": "your-api-key" }
```

**Response `200`:**
```json
{ "access_token": "eyJ..." }
```

Tokens are valid for 24 hours.

---

### `POST /beers`
Add a new beer. Accepts `multipart/form-data`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Beer name (unique) |
| `minTemp` | number | yes | Min acceptable temperature (°C) |
| `maxTemp` | number | yes | Max acceptable temperature (°C) |
| `image` | file | no | Beer image (jpeg/png/webp/gif, **max 2 MB**) |

**Response `201`:**
```json
{
  "id": "uuid",
  "name": "Pilsner",
  "minTemp": 4,
  "maxTemp": 6,
  "imageUrl": "https://<project>.supabase.co/storage/v1/object/public/beer-images/abc123.jpg",
  "createdAt": "2025-08-01T10:00:00.000Z",
  "currentTemperature": 5.2,
  "isInRange": true
}
```

### `GET /beers`
List all beers. Each call generates a fresh random temperature (0–7°C) for every beer and stores it as a historical reading.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Pilsner",
    "minTemp": 4,
    "maxTemp": 6,
    "imageUrl": "https://<project>.supabase.co/storage/v1/object/public/beer-images/abc123.jpg",
    "createdAt": "2025-08-01T10:00:00.000Z",
    "currentTemperature": 3.8,
    "isInRange": false
  }
]
```

---
   
## Design Highlights

- **Controllers stay thin** — controllers only handle HTTP (routing, status codes). All logic lives in services.
- **Input validation** — every incoming request is validated against a DTO. Unknown or extra fields are rejected before they reach any logic.
- **Temperatures recorded in parallel** — when listing beers, all temperature writes happen at the same time instead of one by one, keeping the response fast.
- **Consistent response shape** — every endpoint returns the same predictable structure, so the frontend never has to guess what fields to expect.
- **Auto-created DB tables** — TypeORM creates tables automatically on startup in development, so there's no manual SQL setup needed.
- **JWT authentication** — clients exchange an API key for a short-lived token (24h). That token is required on all beer endpoints.
- **Consistent error responses** — all errors (validation, auth, server) return the same `{ statusCode, message, path, timestamp }` shape. Full error details are logged server-side only — nothing sensitive reaches the client.
- **2 MB image cap** — keeps uploads within Supabase's free storage limits. Oversized files get a clear `413` error instead of a silent crash.
- **Helmet** — adds standard HTTP security headers to every response to guard against common browser-based attacks.

## What I Would Improve Next

- **Health check** — a `GET /health` endpoint so deployment platforms can confirm the app and database are running. (`@nestjs/terminus`)
- **Role-based access** — split JWT tokens into `reader` and `writer` roles so the dashboard can't accidentally trigger write operations. (`RolesGuard` + custom JWT claims)
- **Token refresh** — let clients renew their token without re-sending the API key, so the key is exposed less often. (`POST /auth/refresh`)
- **Rate limiting** — cap how many requests a single device can make, so a faulty sensor can't overwhelm the database with writes. (`@nestjs/throttler`)
- **Pagination** — return beers in pages once the fleet grows large enough that sending the full list becomes slow. (cursor- or offset-based via `GET /beers?page=1`)
- **API docs** — auto-generated documentation so the frontend team can see all endpoints, fields, and error codes without digging through source code. (`@nestjs/swagger`)
- **Real-time updates** — push temperature changes to the dashboard as they happen instead of requiring the client to poll repeatedly. (SSE or WebSockets)

## Questions & Assumptions

**Q: What temperature range is valid for `minTemp`/`maxTemp`?**
A: Assumed –10 to 20°C covers all realistic beer refrigeration scenarios.

**Q: Temperature is randomly generated (0–7°C) — how would real sensors work?**
A: The random generation is a placeholder. With real hardware the architecture would shift to a push model:
- Each sensor (one per container) periodically pushes a reading to a dedicated `POST /beers/:id/temperature` endpoint, authenticated with a device API key.
- The endpoint validates the payload, stores the reading, and the frontend continues polling `GET /beers` as today — no frontend changes needed.
- For high-frequency sensors (e.g. every few seconds) a message queue (MQTT broker or a queue like SQS) would sit between the sensor and the API to absorb bursts and prevent DB overload.
- Alerts (out-of-range for X consecutive readings) could then be triggered from a background worker consuming that queue.

