import { FastifyReply } from "fastify";
import { ApiResponse } from "../types/api.js";

export function createErrorResponse(
  code: string,
  message: string,
): ApiResponse<never> {
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
