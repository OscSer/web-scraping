# Web Scraping Service

Service to extract information from different sources.

## Usage

```bash
npm install
npm run dev
```

## Sources

- **BVC**: Colombian Stock Exchange ticker data
- **Steam**: Game information and reviews
- **AI**: Model ranking from Artificial Analysis data

## Endpoints

- `GET /bvc/ticker/:ticker` - Ticker information
- `GET /game/info?url=<steam-url>` - Game information
- `GET /ai/ranking` - AI model ranking
