import { FastifyReply, FastifyRequest } from "fastify";

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return;

  const rawKey = request.headers["x-api-key"];
  const providedKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

  if (!providedKey) {
    await reply.code(401).send({
      success: false,
      error: {
        code: "MISSING_API_KEY",
        message: "X-API-Key header is required",
      },
    });
    return;
  }

  if (providedKey !== apiKey) {
    await reply.code(403).send({
      success: false,
      error: {
        code: "INVALID_API_KEY",
        message: "Invalid API key",
      },
    });
    return;
  }
}
