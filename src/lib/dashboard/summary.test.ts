import { describe, expect, it } from "vitest";
import { getDashboardSummary } from "@/lib/dashboard/summary";

describe("getDashboardSummary (poin 18 - tanpa statistik palsu)", () => {
  it("mengembalikan nol untuk seluruh metrik karena modul terkait belum ada (Tahap 3-5)", async () => {
    const summary = await getDashboardSummary("business-id-contoh");

    expect(summary).toEqual({
      supplierCount: 0,
      productCount: 0,
      activeOrderCount: 0,
      reminderCount: 0,
    });
  });

  it("tidak melempar galat untuk businessId apa pun", async () => {
    await expect(getDashboardSummary("")).resolves.toBeDefined();
  });
});
