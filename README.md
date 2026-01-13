# Web Scraping Service

Personal service to extract information from different sources.

## Sources

- **BVC**: Colombian Stock Exchange ticker data
- **Steam**: Game information and reviews

## Usage

```bash
npm install
npm run dev
```

## Environment Variables

```bash
HOST=0.0.0.0
PORT=3000
API_KEY=your-secret-key
AUTH_DISABLED=false
```

## Endpoints

- `GET /bvc/ticker/:symbol` - Ticker information
- `GET /game/info?url=<steam-url>` - Game information
