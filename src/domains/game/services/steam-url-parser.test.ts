import { describe, expect, it } from "vitest";
import { extractAppId } from "./steam-url-parser.js";

describe("extractAppId", () => {
  it("returns app id when input is numeric", () => {
    expect(extractAppId(" 47780 ")).toBe("47780");
  });

  it("extracts app id from steam app url", () => {
    const url = "https://store.steampowered.com/app/47780/Dead_Space_2/";
    expect(extractAppId(url)).toBe("47780");
  });

  it("returns null for invalid urls", () => {
    expect(extractAppId("https://example.com/app/not-a-number")).toBeNull();
    expect(extractAppId("https://store.steampowered.com/")).toBeNull();
  });

  it("returns null for empty values", () => {
    expect(extractAppId("")).toBeNull();
    expect(extractAppId("   ")).toBeNull();
  });
});
