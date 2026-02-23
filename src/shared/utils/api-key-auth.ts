import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

interface ApiKeyAuthConfig {
  isDisabled: boolean;
  apiKey: string | undefined;
}

export function hasValidApiKey(
  expectedApiKey: string | undefined,
  rawApiKeyValue: unknown,
): boolean {
  if (!expectedApiKey) return false;
  if (typeof rawApiKeyValue !== "string") return false;

  const apiKeyBuffer = Buffer.from(expectedApiKey);
  const providedApiKeyBuffer = Buffer.from(rawApiKeyValue);

  if (apiKeyBuffer.length !== providedApiKeyBuffer.length) return false;

  return timingSafeEqual(apiKeyBuffer, providedApiKeyBuffer);
}

function getApiKeyFromQuery(rawQuery: unknown): unknown {
  if (!rawQuery || typeof rawQuery !== "object") return undefined;

  const query = rawQuery as Record<string, unknown>;
  return query.apikey;
}

export function createApiKeyOnRequestHook(authConfig: ApiKeyAuthConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (authConfig.isDisabled) return;

    if (hasValidApiKey(authConfig.apiKey, request.headers["x-api-key"])) return;

    const apiKeyQueryParam = getApiKeyFromQuery(request.query);
    if (hasValidApiKey(authConfig.apiKey, apiKeyQueryParam)) return;

    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    });
  };
}
