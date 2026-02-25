# Error Handling

## Error Model

- Shared base errors:
  - `src/shared/types/errors.ts`
- Domain wrappers:
  - `src/domains/bvc/types/errors.ts`
  - `src/domains/game/types/errors.ts`
  - `src/domains/ai/types/errors.ts`
- Services and clients throw typed domain errors for expected external fetch/parse failures.

## Route-Level HTTP Mapping

- BVC endpoint (`src/domains/bvc/routes/ticker.ts`):
  - `400` for invalid ticker input.
  - Fallback chain: Trii -> TradingView.
  - `404` when both providers return no ticker data.
  - `502` when provider errors prevent a successful result.
- Game endpoint (`src/domains/game/routes/info.ts`):
  - `400` for invalid or missing URL/app id.
  - `502` when game info retrieval fails.
- AI endpoint (`src/domains/ai/routes/ranking.ts`):
  - `502` when ranking retrieval or parsing fails.

## Service-Level Behavior

- BVC clients use typed errors for provider failures and parsing problems:
  - `src/domains/bvc/services/trii-client.ts`
  - `src/domains/bvc/services/tradingview-client.ts`
- AI client uses typed errors for upstream fetch/parse failures:
  - `src/domains/ai/services/artificial-analysis-client.ts`
- Game reviews client rethrows typed domain errors and converts unexpected failures through a helper:
  - `src/domains/game/services/steam-reviews-api-client.ts`
  - `src/domains/game/utils/steam-error-handler.ts`

## Practical Rules

- Keep HTTP status and response-shape decisions in routes.
- Keep provider-specific failure parsing and classification in services/clients.
- When adding a provider, add domain-specific wrappers over shared base errors.
