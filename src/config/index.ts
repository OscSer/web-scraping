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
  },
} as const;
