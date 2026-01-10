export const config = {
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
  },
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "300", 10),
  },
  bvc: {
    restApiUrl: "https://rest.bvc.com.co",
    webUrl: "https://www.bvc.com.co",
  },
} as const;
