import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFetchHeaders,
  createErrorResponse,
  fetchWithTimeout,
  sendError,
} from "./api-helpers.js";

describe("buildFetchHeaders", () => {
  it("includes default headers", () => {
    const headers = buildFetchHeaders();

    expect(headers["User-Agent"]).toBeTypeOf("string");
    expect(headers["Accept-Language"]).toBe("en-US,en;q=0.5");
  });

  it("merges and overrides headers from objects, arrays and Headers instances", () => {
    const fromObject = buildFetchHeaders({
      "Accept-Language": "es-CO",
      Accept: "application/json",
    });
    expect(fromObject["Accept-Language"]).toBe("es-CO");
    expect(fromObject.Accept).toBe("application/json");

    const fromArray = buildFetchHeaders([
      ["Accept-Language", "pt-BR"],
      ["X-Test", "array"],
    ]);
    expect(fromArray["Accept-Language"]).toBe("pt-BR");
    expect(fromArray["X-Test"]).toBe("array");

    const fromHeaders = buildFetchHeaders(new Headers([["X-Test", "1"]]));
    expect(fromHeaders["x-test"]).toBe("1");
  });
});

describe("createErrorResponse", () => {
  it("creates a standardized error payload", () => {
    expect(createErrorResponse("INVALID_INPUT", "Invalid input")).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid input",
      },
    });
  });
});

describe("sendError", () => {
  it("sends status code and error body", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const code = vi.fn().mockReturnValue({ send });

    await sendError({ code } as never, 400, "INVALID_INPUT", "Invalid input");

    expect(code).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: {
        code: "INVALID_INPUT",
        message: "Invalid input",
      },
    });
  });
});

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("forwards request options and injects an abort signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = await fetchWithTimeout("https://example.com", {
      method: "POST",
      body: "payload",
      timeoutMs: 100,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        method: "POST",
        body: "payload",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("aborts request when timeout is reached", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      });
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const requestPromise = fetchWithTimeout("https://example.com", {
      timeoutMs: 5,
    });
    const expectation = expect(requestPromise).rejects.toMatchObject({
      name: "AbortError",
    });

    await vi.advanceTimersByTimeAsync(6);

    await expectation;
  });

  it("aborts request when external signal is aborted", async () => {
    const controller = new AbortController();

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      });
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const requestPromise = fetchWithTimeout("https://example.com", {
      signal: controller.signal,
      timeoutMs: 1000,
    });

    controller.abort();

    await expect(requestPromise).rejects.toMatchObject({ name: "AbortError" });
  });
});
