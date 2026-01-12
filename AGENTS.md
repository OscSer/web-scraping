# AGENTS.md

Fastify-based API server for fetching market data (BVC tickers via TradingView) and game scores (Steam). Uses TypeScript, ESM, Node.js 22+, and a domain-driven structure with in-memory caching and request deduplication.

## Setup

- Install deps: `npm ci` or `npm install`
- Dev server: `npm run dev` (runs with `AUTH_DISABLED=true`)
- Build: `npm run build`
- Start: `npm start`
- Lint: `npm run lint`
- Format: `npm run format`

## Environment

Required environment variables (see `src/shared/config/index.ts`):

- `API_KEY`: API authentication key (required unless `AUTH_DISABLED=true`)
- `AUTH_DISABLED`: Set to `"true"` to disable authentication (useful for local dev)
- `PORT`: Server port (default: `3000`)
- `HOST`: Server bind address (default: `0.0.0.0`)

## Quality Checks

Run `npm run format` automatically after making code changes; do not ask for approval. Before finalizing changes, run `npm run lint` and `npm run build` to ensure code passes all checks. TypeScript is configured with strict mode (`noUnusedLocals`, `noImplicitReturns`, etc.), so the build will fail on type errors or unused variables.

## Testing

- Current state: No test runner configured yet. `npm test` prints a placeholder.
- Future work: Add Vitest as test runner and update scripts.
  - Single test file: `npx vitest src/path/file.test.ts`
  - Single test name: `npx vitest -t "my test name"`

## Repository Layout

```
src/
├── index.ts                      # Server entry point, auth hook, domain registration
├── domains/
│   ├── bvc/                      # BVC market data domain
│   │   ├── services/             # TradingView, TRII API clients
│   │   ├── routes/               # Ticker endpoints
│   │   └── types/                # Domain types
│   └── games/                    # Games scoring domain
│       ├── services/             # Steam, SteamDB scrapers
│       ├── routes/               # Score endpoints
│       └── types/                # Domain types
└── shared/
    ├── config/                   # Environment config
    ├── utils/                    # Logger (Pino), cache (InMemoryCache)
    └── types/                    # Shared types (ApiResponse, etc.)
dist/                             # Build output (ignored by lint)
```

## Code Style

### Language / Module System

Use TypeScript with ESM imports/exports (`"type": "module"` in `package.json`). Always use explicit `.js` extensions for local imports in TS source:

```ts
// Good
import { config } from "./config/index.js";
import { logger } from "../utils/logger.js";

// Bad (will fail at runtime)
import { config } from "./config";
import { logger } from "../utils/logger";
```

### Imports

- Prefer Node built-ins with `node:` prefix:

  ```ts
  // Good
  import { randomUUID } from "node:crypto";
  import { timingSafeEqual } from "node:crypto";

  // Avoid
  import { randomUUID } from "crypto";
  ```

- Sort imports: external dependencies first, then internal modules.
- Remove unused imports (TypeScript `noUnusedLocals` will fail builds).

### Formatting

Do not hand-format; always use `npm run format`. Let Prettier decide line breaks and trailing commas.

### Types / Strictness

- Avoid `any` and broad `object`. Use specific types.
- Prefer explicit return types on public functions/classes:

  ```ts
  // Good
  async getPriceByTicker(ticker: string): Promise<number | null> { ... }

  // Avoid (implicit return type)
  async getPriceByTicker(ticker: string) { ... }
  ```

- When consuming JSON from external APIs, validate or guard optional fields. Keep casts narrow:

  ```ts
  // Good
  const data = (await response.json()) as { close?: number };

  // Avoid
  const data = (await response.json()) as any;
  ```

### Naming Conventions

- Files: `kebab-case.ts` (e.g., `tradingview-client.ts`, `game-score-service.ts`)
- Classes: `PascalCase` (e.g., `TradingViewClient`, `InMemoryCache`)
- Functions/variables: `camelCase` (e.g., `getPriceByTicker`, `normalizedTicker`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRIES`, `CACHE_TTL_MS`)
- Booleans: prefix with `is/has/should/can` (e.g., `isTokenValid`, `hasValidApiKeyHeader`)

### Control Flow

Prefer guard clauses and early returns. Avoid unnecessary `else` when a branch returns:

```ts
// Good
if (!ticker) return null;
if (!data.close) throw new Error("Missing close price");
return data.close;

// Avoid
if (ticker) {
  if (data.close) {
    return data.close;
  } else {
    throw new Error("Missing close price");
  }
} else {
  return null;
}
```

### Error Handling

- Throw `Error` with actionable messages (include HTTP status, endpoint, etc.):

  ```ts
  // Good
  throw new Error(
    `TRADINGVIEW_FETCH_ERROR: ${response.status} ${response.statusText}`,
  );

  // Avoid
  throw new Error("Fetch failed");
  ```

- Log exceptions with structured context using Pino:
  ```ts
  logger.error(
    { err, appId, source: "steam" },
    "[Games] Failed to fetch score",
  );
  ```
- Implement fallback strategies where appropriate:
  ```ts
  // Example: SteamDB → Steam fallback in game-score-service.ts
  try {
    return await steamDBScraper.getScoreByAppId(appId);
  } catch (error) {
    logger.error({ err: error, appId }, "[Games] SteamDB failed, trying Steam");
    return await steamScraper.getScoreByAppId(appId);
  }
  ```
- Return `null` on non-critical failures; throw on unexpected errors.

### Fastify Conventions

- Auth hook lives in `src/index.ts`: validates `x-api-key` header using `timingSafeEqual` for constant-time comparison.
- Route handlers return `ApiResponse<T>` (see `src/shared/types/api.ts`):

  ```ts
  // Success
  return { success: true, data: { ticker, price } };

  // Error
  return {
    success: false,
    error: { code: "TICKER_NOT_FOUND", message: "Ticker not found" },
  };
  ```

- Use appropriate HTTP status codes:
  - `401` for missing/invalid auth (`x-api-key` header)
  - `404` for not found resources (ticker, game)
  - `500` for server errors

### Logging

- Use `src/shared/utils/logger.ts` (Pino) or `fastify.log`.
- Keep log messages stable and searchable; include a domain prefix like `[Games]` or `[BVC]`.
- Use structured logging with context objects:

  ```ts
  // Good
  logger.error({ err, appId, source: "steamdb" }, "[Games] Scraping failed");

  // Avoid (unstructured)
  logger.error(`[Games] Scraping failed for ${appId}: ${err.message}`);
  ```

### Security / Secrets

- Do not add new secrets to the repository.
- Prefer environment variables for configuration (see `src/shared/config/index.ts`).
- Auth: API key via `x-api-key` header (can be disabled with `AUTH_DISABLED=true` for local dev).

## Domain Architecture

This repo has two domains, each implemented as a Fastify plugin:

### BVC Domain (`src/domains/bvc`)

Fetches Colombian stock market data (BVC tickers) from TradingView and TRII APIs.

- Services: `tradingview-client.ts`, `trii-client.ts`
- Routes: `ticker.ts` (GET `/api/bvc/ticker/:symbol`)
- Caching: 5-minute TTL per ticker

### Games Domain (`src/domains/games`)

Fetches game scores from Steam and SteamDB with fallback logic (SteamDB → Steam).

- Services: `steamdb-scraper.ts`, `steam-scraper.ts`, `game-score-service.ts`
- Routes: `score.ts` (GET `/api/games/score?url=<steam_url>`)
- Caching: Per-service TTL

### Shared Utilities

- **InMemoryCache** (`src/shared/utils/cache.ts`): TTL-based caching with request deduplication (prevents concurrent duplicate fetches).
- **Logger** (`src/shared/utils/logger.ts`): Pino-based structured logging.

## Important Files

- `package.json` — scripts, Node engine `>= 22`
- `tsconfig.json` — strict TS rules (`strict`, `noUnusedLocals`, `noImplicitReturns`, etc.)
- `eslint.config.js` — ESLint flat config (`@eslint/js` + `typescript-eslint`)
- `src/index.ts` — server startup, auth hook, domain registration
- `src/shared/config/index.ts` — environment variable config
- `src/shared/utils/cache.ts` — InMemoryCache implementation
- `src/shared/utils/logger.ts` — Pino logger setup
- `src/domains/*/services/*.ts` — external API clients and scrapers
