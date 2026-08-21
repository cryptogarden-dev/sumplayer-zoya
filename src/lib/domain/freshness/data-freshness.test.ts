import { describe, expect, it } from "vitest";
import { evaluateFreshness } from "@/lib/domain/freshness/data-freshness";

describe("evaluateFreshness", () => {
  const now = new Date("2026-08-18T00:00:00.000Z");

  it("menandai data baru (belum melewati ambang) sebagai tidak lama", () => {
    const lastUpdatedAt = new Date("2026-08-16T00:00:00.000Z");
    const result = evaluateFreshness({ lastUpdatedAt, thresholdDays: 7, now });
    expect(result.daysSinceUpdate).toBe(2);
    expect(result.isStale).toBe(false);
  });

  it("menandai data lama (melewati ambang) sebagai stale dengan peringatan", () => {
    const lastUpdatedAt = new Date("2026-08-01T00:00:00.000Z");
    const result = evaluateFreshness({ lastUpdatedAt, thresholdDays: 7, now });
    expect(result.daysSinceUpdate).toBe(17);
    expect(result.isStale).toBe(true);
    expect(result.message).toContain("Disarankan konfirmasi");
  });

  it("tepat di ambang batas dianggap stale (pakai >=)", () => {
    const lastUpdatedAt = new Date("2026-08-11T00:00:00.000Z");
    const result = evaluateFreshness({ lastUpdatedAt, thresholdDays: 7, now });
    expect(result.daysSinceUpdate).toBe(7);
    expect(result.isStale).toBe(true);
  });

  it("ambang dapat dikonfigurasi (bukan hardcode)", () => {
    const lastUpdatedAt = new Date("2026-08-16T00:00:00.000Z");
    const result = evaluateFreshness({ lastUpdatedAt, thresholdDays: 1, now });
    expect(result.isStale).toBe(true);
  });
});
