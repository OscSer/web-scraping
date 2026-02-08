import { FastifyReply } from "fastify";
import { USER_AGENT } from "../config/index.js";
import { ApiResponse } from "../types/api.js";

export type HeaderInput = Record<string, string> | Array<[string, string]> | Headers;

const DEFAULT_FETCH_TIMEOUT_MS = 15000;

function normalizeHeaders(headers?: HeaderInput): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

export function buildFetchHeaders(overrides?: HeaderInput): Record<string, string> {
  const baseHeaders = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.5",
  };

  return {
    ...baseHeaders,
    ...normalizeHeaders(overrides),
  };
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...init } = options;
  const timeoutController = new AbortController();
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: combinedSignal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createErrorResponse(code: string, message: string): ApiResponse<never> {
  return {
    success: false,
    error: { code, message },
  };
}

export async function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
): Promise<void> {
  await reply.code(statusCode).send(createErrorResponse(code, message));
}
