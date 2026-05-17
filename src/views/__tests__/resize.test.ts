import { describe, expect, it } from "vitest";
import { clampDragHeight } from "../resize";

describe("clampDragHeight", () => {
  it("returns startHeight + delta when above min", () => {
    expect(clampDragHeight(300, 50, 100)).toBe(350);
  });

  it("clamps to minHeight when delta would push below", () => {
    expect(clampDragHeight(120, -100, 100)).toBe(100);
  });

  it("returns startHeight when delta is zero", () => {
    expect(clampDragHeight(220, 0, 100)).toBe(220);
  });

  it("permits unbounded growth", () => {
    expect(clampDragHeight(300, 10000, 100)).toBe(10300);
  });

  it("clamps exactly at min when delta lands on it", () => {
    expect(clampDragHeight(200, -100, 100)).toBe(100);
  });
});
