# Beer Monitoring App — Backend

## Project Overview
NestJS + TypeScript backend API for a craft brewery mobile app that monitors refrigerated beer container temperatures on delivery trucks.

## Requirements (from Pragmateam BACKEND Code Exercise v2.1)

### In Scope
- **Add new beer** — name, temperature range (min/max °C), image upload
- **View all beers and temps** — list all beers with their current temperature reading
- **Flag beer temp in range or out of range** — compare current temp against min/max range
- **Store historical temperature readings** — persist each temp reading to DB

### Out of Scope
- Temperature trends chart
- Delete beer
- Retrieval of temperature history (store only)

### Temperature Reading Logic
- Return a **random temperature between 0–7°C** for each beer on each reading, rounded to **1 decimal place** (`toFixed(1)`)
- Store every reading in DB for historical purposes
- No endpoint needed to retrieve history

### Frontend Considerations
- Dashboard polls for real-time data — design endpoints with polling in mind
- Multiple clients hit endpoints simultaneously — ensure responsiveness
- Works across web and mobile

## Tech Stack

- **Framework:** NestJS with TypeScript

- **Database: Supabase (PostgreSQL) via TypeORM (`pg` driver)**
  *Why:* Supabase is a fully managed PostgreSQL service — no server to set up, has a free tier, and includes a dashboard to browse data directly. TypeORM lets us define tables as TypeScript classes instead of writing raw SQL, and the `pg` driver is the standard connector Node.js uses to talk to PostgreSQL under the hood.

- **File Uploads: Multer (`memoryStorage`) → Supabase Storage (`beer-images` bucket)**
  *Why:* Multer intercepts the uploaded file and holds it in memory as a buffer (never writes to disk). We then send that buffer straight to a Supabase Storage bucket, which acts like a CDN and returns a permanent public URL. That URL is what we store in the DB. This keeps the API server stateless — no local files to worry about across restarts or deployments.
  *Setup:* The `beer-images` bucket must be created in the Supabase dashboard before first use. Uploads use the **service-role key** to bypass RLS. Filenames are `<uuidv4>.<ext>` to avoid collisions; `upsert: false` prevents silent overwrites.

- **Validation: `class-validator` + `class-transformer`**
  *Why:* `class-validator` lets us decorate DTO properties with rules (`@IsString()`, `@Min()`, etc.) so NestJS automatically rejects bad input before it reaches our code — no manual `if` checks needed. `class-transformer` converts raw incoming strings/objects into proper typed class instances so those decorators can actually run (e.g. coercing `"4"` → `4` for multipart form fields).

- **Config: `@nestjs/config`**
  *Why:* Reads the `.env` file and exposes all environment variables through an injectable `ConfigService`. Keeps secrets (DB password, API keys) out of source code and makes it easy to use different values per environment without changing any code.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/token` | Exchange API key for a 24-hour JWT |
| `POST` | `/beers` | Add a new beer (multipart/form-data) — requires JWT |
| `GET` | `/beers` | List all beers with current temp + in-range flag — requires JWT |

## Project Structure
```
src/
  auth/
    auth.controller.ts     ← POST /auth/token
    auth.service.ts        ← token generation + API key validation
    auth.module.ts
    jwt.guard.ts           ← JwtGuard applied to all /beers routes
    jwt.strategy.ts        ← Passport JWT strategy
  beers/
    dto/
      create-beer.dto.ts
      beer-response.dto.ts
    entities/
      beer.entity.ts
    beers.controller.ts
    beers.service.ts
    beers.module.ts
  common/
    all-exceptions.filter.ts  ← global exception filter; consistent error shape
  storage/
    storage.service.ts     ← Supabase Storage upload
    storage.module.ts
  temperature-readings/
    entities/
      temperature-reading.entity.ts
    temperature-readings.service.ts
    temperature-readings.module.ts
  app.module.ts
  main.ts
```

## Data Model

### Beer
- `id` UUID PK
- `name` string (unique)
- `minTemp` float (validated: -10 to 20°C; must be less than `maxTemp`)
- `maxTemp` float (validated: -10 to 20°C; must be greater than `minTemp`)
- `imageUrl` string | null (public Supabase Storage URL, or null if no image uploaded)
- `createdAt` timestamp

### TemperatureReading
- `id` UUID PK
- `beer` ManyToOne → Beer (`onDelete: 'CASCADE'` — readings deleted when beer is deleted)
- `temperature` float (random 0–7, 1 decimal place)
- `recordedAt` timestamp

## Conventions & Patterns
- Use DTOs with `class-validator` decorators for all input validation
- Services own all business logic; controllers are thin
- One module per domain feature
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`
- Global `AllExceptionsFilter` — all errors return `{ statusCode, message, path, timestamp }`; unexpected errors log full stack server-side only
- `@nestjs/config` for environment variables (`.env`)
- Responses use consistent shape via `BeerResponseDto`
- **JWT auth** — all `/beers` routes protected by `JwtGuard`; token obtained via `POST /auth/token` with pre-shared `API_KEY`
- **Helmet** applied globally for HTTP security headers
- Image uploads: Multer `memoryStorage` → Supabase Storage; 2 MB limit; jpeg/png/webp/gif only; multipart field name must be `image`; `upsert: false` (no overwrites)
- `Promise.all` for parallel temperature recording on `GET /beers`
- **CORS** enabled globally via `app.enableCors()` in `main.ts`
- **TypeScript** — `strictNullChecks: true` and `noImplicitOverride: true` are on; `noImplicitAny` is off; avoid `any` regardless
- **JWT payload** — `{ sub: 'api-client' }` (hardcoded; `sub` is available as `request.user.clientId` after guard validation)
- **Supabase Storage** — the `beer-images` bucket must be pre-created in the Supabase dashboard; the **service-role key** is used server-side so uploads bypass Row Level Security (RLS)
- **`TokenRequestDto`** — defined inline in `auth.controller.ts` (not in a `dto/` folder); acceptable because it is only used in that one controller
- **Module dependencies** — `BeersModule` imports `TemperatureReadingsModule` (for `TemperatureReadingsService`) and `StorageModule` (for `StorageService`); both must export their services
- **Comments** — add a short, simple comment to every class, method, and non-obvious line; explain *what* it does and *why*, not just restate the code

## Running Locally
```bash
npm install
cp .env.example .env   # fill in your Supabase credentials
npm run start:dev
```
Uploads folder is auto-created on first run. TypeORM `synchronize: true` auto-creates DB tables in development.

## Environment Variables (.env)
```
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
JWT_SECRET=<random 32-byte hex>
API_KEY=<random 24-byte base64>
```
