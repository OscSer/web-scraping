# Web Scraping Service

Service to extract information from different sources.

## Sources

- **BVC**: Colombian Stock Exchange ticker data
- **Steam**: Game information and reviews
- **AI**: Model ranking from Artificial Analysis data

## Usage

```bash
npm install
npm run dev
```

## Authentication

- API key auth is enabled by default.
- Set `API_KEY` in your environment (see `.env.example`).
- Disable auth only for local/dev scenarios with `AUTH_DISABLED=true`.

Pass the key using one of these options:

- Header: `x-api-key: <your-api-key>`
- Query param: `?apikey=<your-api-key>`

## Endpoints

- `GET /bvc/ticker/:ticker` - Ticker information
- `GET /game/info?url=<steam-url>` - Game information
- `GET /ai/ranking` - AI model ranking

## Tech Stack

- **Node.js** (>=22.0.0)
- **TypeScript**
- **Fastify**
- **Upstash Redis**
