# TypeScript / NestJS Concepts Q&A

## Is there a need to use TypeScript interfaces?

In this project specifically, **no** — classes cover everything:

- **DTOs** must be classes so `class-validator`/`class-transformer` decorators can work at runtime (interfaces are erased at compile time)
- **Entities** are TypeORM classes with decorators
- **Services/Controllers** are injectable NestJS classes

Interfaces are useful for defining shapes that don't need runtime existence (e.g., config object types, method contracts), but nothing in this project requires that. The `BeerResponseDto` class already acts as the typed contract for responses.

Short answer: stick with classes here.

---

## More simple explanation

Interfaces are just TypeScript — they disappear at runtime. Decorators (like `@IsString()`, `@Column()`) need real classes to attach to, so classes are used everywhere instead.

---

## What are decorators?

Decorators are functions that add behavior to a class, method, or property by placing `@something` above it.

```typescript
@IsString()
name: string;
```

That `@IsString()` tells the validator "reject this if it's not a string." Without the decorator, it's just a plain property with no rules attached.

Used for:
- **Validation** — `@IsString()`, `@Min()`, `@IsNumber()`
- **Database** — `@Column()`, `@Entity()`, `@PrimaryGeneratedColumn()`
- **NestJS DI** — `@Injectable()`, `@Controller()`, `@Get()`, `@Post()`

---

## What are: config object types, method contracts?

**Config object types** — describing the shape of a settings object:
```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  password: string;
}
```
Just documents what fields are expected.

**Method contracts** — describing what a class must implement:
```typescript
interface StorageService {
  upload(file: Buffer): Promise<string>;
}
```
Any class that `implements StorageService` is forced to have that `upload` method.

Both are just compile-time checks — TypeScript enforces them, but they're gone at runtime.

---

## What are DTOs?

**DTO = Data Transfer Object** — a class that defines the shape of data coming in or going out of an endpoint.

```typescript
export class CreateBeerDto {
  @IsString()
  name: string;

  @IsNumber()
  minTemp: number;

  @IsNumber()
  maxTemp: number;
}
```

When a request hits `POST /beers`, NestJS maps the body to this class and runs the validators. If `name` is missing or `minTemp` is not a number, it rejects the request automatically — before your code even runs.

Two purposes:
- **Input DTOs** — validate incoming data (`CreateBeerDto`)
- **Response DTOs** — define what you send back (`BeerResponseDto`)

---

## How does NestJS assign API endpoints?

NestJS assigns endpoints through **decorators** on controller classes and methods.

**1. Base path — `@Controller()`**
```typescript
@Controller('beers')  // → all routes start with /beers
export class BeersController {}
```

**2. HTTP method + sub-path**
```typescript
@Get()        // → GET /beers
@Post()       // → POST /beers
@Get(':id')   // → GET /beers/:id
```

**3. NestJS wires it at bootstrap**

When `NestFactory.create(AppModule)` runs, NestJS scans all modules for `@Controller()` classes, reads their method decorators, and registers each combined route (`controller path + method path`) with Express. No manual route registration needed.

---

## Can NestJS endpoints be customized?

Yes. Common options:

**Global prefix** — prepend a segment to every route
```typescript
app.setGlobalPrefix('api');
// → GET /api/beers, POST /api/beers
```

**Versioning** — version routes via URL
```typescript
app.enableVersioning({ type: VersioningType.URI });

@Controller({ path: 'beers', version: '1' })
// → GET /v1/beers
```

**Sub-paths on methods**
```typescript
@Get('featured')       // → GET /beers/featured
@Get(':id/readings')   // → GET /beers/:id/readings
```

**Route params, query, wildcards**
```typescript
@Get(':id')   // /beers/123
@Get('*')     // matches anything
```

> Note: specific paths (e.g. `featured`) must be declared before wildcard params (`:id`) or they get swallowed.

---

## Global Error Handler

A global exception filter catches every unhandled exception across the app and returns a clean, consistent response instead of leaking raw stack traces.

### What it catches
- TypeORM / database errors
- Supabase Storage errors
- Unexpected runtime errors
- Any exception not already handled by NestJS HTTP exceptions

### Two cases handled

**Known errors** (NestJS `HttpException` — 400, 401, 404, 409, etc.)
- Forwarded to the client as-is — status and message are safe
- Nothing logged to terminal

**Unknown errors** (DB crash, runtime error, etc.)
- Returns a generic 500 to the client — no internals exposed
- Full stack trace logged to terminal server-side only

### Response shape
```json
{
  "statusCode": 409,
  "message": "Beer \"Pilsner\" already exists",
  "path": "/beers",
  "timestamp": "2026-03-11T09:00:00.000Z"
}
```

### Terminal output (unknown errors only)
```
[Nest] 12204  - 03/11/2026, 9:00:00 AM   ERROR [AllExceptionsFilter] Unhandled exception on POST /beers
Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1555:16)
```

### How it's registered
```typescript
// main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

`@Catch()` with no arguments means it catches everything — not just specific exception types.

---

## API Authentication — JWT + API Key

### How it works

1. Client sends their API key to `POST /auth/token`
2. Server validates it against the `API_KEY` env var and returns a signed JWT
3. Client includes the JWT as a Bearer token on all protected requests
4. NestJS `JwtGuard` verifies the token on every protected route — invalid/missing token returns `401`

### Endpoint summary

| Method | Path | Auth required |
|---|---|---|
| `POST` | `/auth/token` | No |
| `POST` | `/beers` | Yes |
| `GET`  | `/beers` | Yes |

### Usage
```bash
# Step 1 — get a token
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{ "apiKey": "your-api-key" }'
# → { "access_token": "eyJ..." }

# Step 2 — use the token
curl http://localhost:3000/beers \
  -H "Authorization: Bearer eyJ..."
```

### Generating env var values

No external tool needed — Node.js `crypto` is built in:

```bash
# JWT_SECRET — random, unguessable signing secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# API_KEY — password your clients use to request a token
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

- **`JWT_SECRET`** — used to sign and verify JWTs; never expose this
- **`API_KEY`** — shared with your frontend/mobile app; used once to get a token
- Token expiry is set to `24h` in `auth.module.ts`

---

## Helmet — HTTP Security Headers

Helmet is an npm package that sets protective HTTP response headers in one line. It doesn't block requests — it just tells browsers how to behave when handling your API responses.

### What it does

| Header | What it prevents |
|---|---|
| Removes `X-Powered-By` | Hides that you're running Express/NestJS from attackers |
| `X-Content-Type-Options: nosniff` | Browser guessing file types (MIME sniffing attacks) |
| `X-Frame-Options: SAMEORIGIN` | Your API being embedded in an iframe (clickjacking) |
| `Strict-Transport-Security` | Browsers connecting over HTTP instead of HTTPS |
| `X-DNS-Prefetch-Control: off` | DNS prefetching leaking requests |

### Usage

```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet());
```

One line covers all headers above automatically.

### Priority

Low for a test app — you're not handling sensitive user data or exposing to the public internet. But it's a good habit and signals security awareness to reviewers.

### Browser-based attacks Helmet protects against

**Clickjacking**
An attacker embeds your site invisibly inside an `<iframe>` on their malicious page, then tricks users into clicking buttons they can't see.
```
Attacker's page (visible):  "Click here to win a prize!"
Your app (invisible iframe): [Delete Account button sitting right under it]
```
User thinks they're clicking the prize button — they're actually clicking Delete Account on your app.
Helmet's fix: sets `X-Frame-Options: SAMEORIGIN` — browser refuses to render your app inside any iframe from another origin.

---

**MIME Sniffing**
Browsers try to be "helpful" by guessing what a file actually is, ignoring what the server says. An attacker uploads a file named `photo.jpg` that secretly contains JavaScript. The browser sniffs it, thinks "this looks like a script", and executes it.
```
Server says:  Content-Type: image/jpeg
Browser sees: looks like JS to me → runs it
```
Helmet's fix: sets `X-Content-Type-Options: nosniff` — forces the browser to trust the server's declared content type and never guess.

---

**DNS Prefetching**
Browsers speculatively resolve domain names found in your page before the user clicks. This leaks what links exist on your page to DNS servers.
Helmet's fix: sets `X-DNS-Prefetch-Control: off` to disable this.

---

**Forced HTTPS (HSTS)**
Without this, a user who types `yourapp.com` hits HTTP first before being redirected to HTTPS — that first request is vulnerable to interception.
Helmet's fix: sets `Strict-Transport-Security` — tells browsers to always use HTTPS directly, skipping the HTTP step entirely.

---

**Hiding your tech stack**
By default Express adds `X-Powered-By: Express` to every response. This tells attackers exactly what framework you're running, making targeted exploits easier.
Helmet's fix: removes this header entirely.

---

## When does a DTO not exist?

DTOs only exist for **external input** — data coming in from a request that needs validating.

`TemperatureReading` has no create DTO because there is no user input. The temperature is generated internally by the service (random 0–7°C) and the `beer` relationship is passed directly in code. Nothing comes from the request body, so there is nothing to validate or shape.

Rule of thumb: if the data originates inside your code, no DTO needed. If it comes from outside (a request body, query param, file upload), it needs a DTO.

---

## NestJS IoC Container

**IoC = Inversion of Control.**

Normally you create dependencies yourself:
```typescript
// You are in control — you build what you need
const repo = new BeerRepository();
const tempService = new TemperatureReadingsService(repo);
const service = new BeersService(tempService);
const controller = new BeersController(service);
```

IoC inverts that — instead of you creating things, you hand control to a container (NestJS) and let it build and wire everything for you:
```typescript
// You just declare what you need, NestJS builds it
@Injectable()
export class BeersService {
  constructor(
    private readonly temperatureReadingsService: TemperatureReadingsService,
  ) {}
}
```

NestJS reads the constructor, sees `TemperatureReadingsService` is needed, builds it, and injects it automatically. You never call `new`.

### Why it matters

| Without IoC | With IoC |
|---|---|
| You manage every dependency manually | NestJS manages the dependency tree |
| Changing a service constructor breaks all callers | Change happens in one place |
| Hard to test — tight coupling | Easy to swap real service for a mock in tests |

### The container's job

1. Reads all `@Injectable()`, `@Controller()` classes declared in modules
2. Figures out the full dependency tree
3. Creates each class **once** (singleton by default) and reuses it
4. Injects them wherever needed

> This is why forgetting to add a service to a module's `providers` array causes the **"Nest can't resolve dependencies"** error — the container doesn't know it exists.
