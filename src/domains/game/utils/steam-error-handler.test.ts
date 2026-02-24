import { describe, expect, it, vi } from "vitest";
import { handleSteamError } from "./steam-error-handler.js";

describe("handleSteamError", () => {
  it("logs error and returns fallback value", () => {
    const logger = { error: vi.fn() };

    const result = handleSteamError(
      logger as never,
      new Error("unexpected"),
      "47780",
      "Steam Reviews API client",
      "fallback",
    );

    expect(result).toBe("fallback");
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
