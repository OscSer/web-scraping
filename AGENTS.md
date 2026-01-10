# Repository Agent Instructions (bvc-crawler)

These instructions are for agentic coding tools working in this repo.

## Quick Facts

- Runtime: Node.js `>= 22` (see `package.json`)
- Language: TypeScript (ESM) with `moduleResolution: bundler` (see `tsconfig.json`)
- Web server: Fastify (`src/index.ts`)
- HTTP client: global `fetch` (Node 22)
- Lint/format: ESLint (flat config) + Prettier
- Tests: not implemented yet (`npm test` prints "No tests yet")

## Commands

### Install

- Install deps (CI): `npm ci`
- Install deps (dev): `npm install`

### Dev / Run

- Run server (watch): `npm run dev`
- Build TypeScript: `npm run build`
- Start built server: `npm start`

### Typecheck

- Typecheck (tsc via build): `npm run build`
  - `tsconfig.json` is strict (`strict`, `noUnusedLocals`, `noImplicitReturns`, etc.).

### Lint

- Lint all TS: `npm run lint`
  - Target: `src/**/*.ts`
  - Config: `eslint.config.js` (`@eslint/js` + `typescript-eslint` recommended presets)
  - Ignored: `dist/`, `node_modules/`, `*.config.js`

### Format

- Format all TS: `npm run format`
  - Targets: `src/**/*.ts`
  - No Prettier config is committed; use Prettier defaults.

### Tests

- Run tests: `npm test`
  - Current state: no test runner configured; `npm test` prints a placeholder.
  - Suggested future runner: Vitest
    - Single test file: `npx vitest src/path/file.test.ts`
    - Single test name: `npx vitest -t "my test name"`
  - Alternative: Jest
    - Single test file: `npx jest src/path/file.test.ts`
    - Single test name: `npx jest -t "my test name"`

### Future Work

- Add a test runner (Vitest preferred) and update `package.json` scripts so agents can run single tests via `npm test -- ...`.

## Repository Layout

- Entry point: `src/index.ts`
- HTTP routes: `src/routes/*`
- Service clients: `src/services/*`
- Middleware: `src/middleware/*`
- Shared types: `src/types/*`
- Utilities: `src/utils/*`
- Build output: `dist/` (ignored by lint)

## Code Style Guidelines

### Language / Module System

- Use TypeScript with ESM imports/exports (`"type": "module"` in `package.json`).
- Use explicit file extensions for local imports in TS source:
  - Good: `import { config } from "./config/index.js";`
  - Avoid: `import { config } from "./config";`

### Imports

- Prefer Node built-ins with `node:` prefix (repo pattern): `import { randomUUID } from "node:crypto";`.
- Sort imports: external first, then internal.
- Keep import lists minimal; remove unused imports (TypeScript `noUnusedLocals` will fail builds).

### Formatting

- Do not hand-format; prefer `npm run format`.
- Let Prettier decide line breaks and trailing commas.

### Types / Strictness

- Avoid `any` and broad `object`.
- Prefer explicit return types on public functions/classes where it clarifies intent.
- When consuming JSON from external APIs:
  - Prefer validating/guarding when fields are optional.
  - If you cast, keep casts narrow (e.g., `as { client_ip: string }`).

### Naming Conventions

- Files: `kebab-case.ts` (e.g., `token-manager.ts`).
- Classes: `PascalCase`.
- Functions/variables: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` for module-scope constants (e.g., `MAX_RETRIES`).
- Booleans: prefix with `is/has/should/can` (e.g., `isTokenValid`).

### Control Flow

- Prefer guard clauses and early returns.
- Avoid unnecessary `else` when a branch returns.

### Error Handling

- Throw `Error` with actionable messages (include HTTP status, endpoint, etc.).
- Log exceptions with context:
  - Prefer `logger.error({ err }, "[Component] message")`.
- Retries:
  - Keep “retriable HTTP status” separate from “network errors” (see `src/services/bvc-client.ts`).
  - Use small, bounded retry loops with incremental backoff.

### Fastify Conventions

- Middleware hooks should be `async` and return `Promise<void>` (see `src/middleware/auth.ts`).
- Route handlers should return consistent JSON response shapes.
- Use appropriate status codes:
  - `401` for missing auth header
  - `403` for invalid auth

### Logging

- Use `src/utils/logger.ts` (Pino) or `fastify.log`.
- Keep log messages stable and searchable; include a prefix like `[TokenManager]`.

### Security / Secrets

- Do not add new secrets to the repository.
- Prefer env vars for configuration; use `.env.example` as reference.
- Important: `src/services/token-manager.ts` contains embedded credentials used to generate a token. Avoid duplicating these values or spreading them into new files.

## Refs (Important Files)

- `package.json` (scripts, Node engine)
- `tsconfig.json` (compiler rules)
- `eslint.config.js` (lint config)
- `src/index.ts` (server startup/shutdown)
- `src/services/bvc-client.ts` (HTTP + retry behavior)
- `src/services/token-manager.ts` (token creation and caching)

