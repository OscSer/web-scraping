export const config = {
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
  },
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "300", 10),
  },
  bvc: {
    restApiUrl: process.env.BVC_REST_API_URL || "https://rest.bvc.com.co",
    webUrl: process.env.BVC_WEB_URL || "https://www.bvc.com.co",
    token: process.env.BVC_TOKEN,
  },
  playwright: {
    enabled: process.env.ENABLE_PLAYWRIGHT !== "false",
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    timeoutMs: parseInt(process.env.PLAYWRIGHT_TIMEOUT_MS || "30000", 10),
  },
} as const;
