# Web Scraping Service

Service to extract information from different sources.

## Sources

- **BVC**: Colombian Stock Exchange ticker data
- **Steam**: Game information and reviews

## Usage

```bash
npm install
npm run dev
```

## Endpoints

- `GET /bvc/ticker/:symbol` - Ticker information
- `GET /game/info?url=<steam-url>` - Game information

## Tech Stack

- **Node.js** (>=22.0.0)
- **TypeScript**
- **Fastify**
- **Upstash Redis**
