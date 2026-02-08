import { describe, expect, it, vi } from "vitest";
import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { handleSteamError } from "./steam-error-handler.js";

describe("handleSteamError", () => {
  it("logs warn and returns fallback for known steam errors", () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const fallback = null;

    const result = handleSteamError(
      logger as never,
      new SteamFetchError("failed", 500, "error"),
      "47780",
      "Steam Reviews API client",
      fallback,
    );

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs error and returns fallback for unknown errors", () => {
    const logger = { warn: vi.fn(), error: vi.fn() };

    const result = handleSteamError(
      logger as never,
      new Error("unexpected"),
      "47780",
      "Steam Reviews API client",
      "fallback",
    );

    expect(result).toBe("fallback");
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("treats parse error as known steam error", () => {
    const logger = { warn: vi.fn(), error: vi.fn() };

    handleSteamError(
      logger as never,
      new SteamParseError("invalid payload"),
      "47780",
      "Steam Details API client",
      0,
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
