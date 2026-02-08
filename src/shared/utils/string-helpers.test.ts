import { describe, expect, it } from "vitest";
import { normalizeTicker } from "./string-helpers.js";

describe("normalizeTicker", () => {
  it("returns lowercase ticker for valid input", () => {
    expect(normalizeTicker(" Ecopetrol ")).toBe("ecopetrol");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(normalizeTicker("")).toBeNull();
    expect(normalizeTicker("   ")).toBeNull();
  });
});
