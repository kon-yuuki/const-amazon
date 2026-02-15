import { describe, expect, it } from "vitest";

import { encodeShareState, decodeShareState } from "@/lib/share/codec";
import { createDefaultState } from "@/lib/state/defaults";

describe("share codec", () => {
  it("encodes and decodes state", () => {
    const base = createDefaultState();
    const encoded = encodeShareState(base);
    const decoded = decodeShareState(encoded);

    expect(decoded.schemaVersion).toBe(base.schemaVersion);
    expect(decoded.members).toHaveLength(base.members.length);
  });

  it("throws on invalid payload", () => {
    expect(() => decodeShareState("not-valid")).toThrow();
  });
});
