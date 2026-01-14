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

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
