export const config = {
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
  },
  auth: {
    isDisabled: process.env.AUTH_DISABLED === "true",
    apiKey: process.env.API_KEY,
  },
  cache: {
    isDisabled: process.env.CACHE_DISABLED === "true",
    upstash: {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  },
} as const;
