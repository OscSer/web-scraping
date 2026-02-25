# Web Scraping Service

Service to extract information from different sources.

## Usage

```bash
npm install
npm run dev
```

## Project Structure

```text
web-scraping/
├── src/                    # Application source code
│   ├── domains/            # Feature modules
│   │   ├── ai/
│   │   ├── bvc/
│   │   └── game/
│   └── shared/             # Cross-domain code (config, types, utils)
└── docs/                   # Architecture and design notes
```

## Sources

- **BVC**: Colombian Stock Exchange ticker data
- **Steam**: Game information and reviews
- **AI**: Custom model ranking from Artificial Analysis data

## Endpoints

- `GET /bvc/ticker/:ticker` - Ticker information
- `GET /game/info?url=<steam-url>` - Game information
- `GET /ai/ranking` - AI model ranking
