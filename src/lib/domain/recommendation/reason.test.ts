import { describe, expect, it } from "vitest";
import { buildRecommendationReason } from "@/lib/domain/recommendation/reason";
import { LABEL } from "@/lib/domain/recommendation/labels";

describe("buildRecommendationReason (R14)", () => {
  it("menjelaskan label positif konkret saat direkomendasikan", () => {
    const text = buildRecommendationReason({
      eligible: true,
      isRecommended: true,
      labels: [LABEL.CHEAPEST_UNIT_PRICE, LABEL.STOCK_AVAILABLE],
      eligibility: { eligible: true, blockingReasons: [], cautionNotes: [] },
      performanceMessage:
        "Data pengiriman belum tersedia — belum ada pesanan selesai yang tercatat.",
    });
    expect(text).toContain("harga per satuan termurah");
    expect(text).toContain("stok tersedia");
    expect(text).toContain("Data pengiriman belum tersedia");
  });

  it("tidak mengarang alasan positif jika tidak ada label unggulan, tetap transparan", () => {
    const text = buildRecommendationReason({
      eligible: true,
      isRecommended: true,
      labels: [],
      eligibility: { eligible: true, blockingReasons: [], cautionNotes: [] },
      performanceMessage: "Data masih terbatas, berdasarkan 2 pengiriman.",
    });
    expect(text).toMatch(/kombinasi total biaya/i);
  });

  it("menampilkan alasan penolakan tegas (blocking) apa adanya", () => {
    const text = buildRecommendationReason({
      eligible: false,
      isRecommended: false,
      labels: [],
      eligibility: {
        eligible: false,
        blockingReasons: ["Stok kosong, tidak dapat memenuhi kebutuhan."],
        cautionNotes: [],
      },
      performanceMessage:
        "Data pengiriman belum tersedia — belum ada pesanan selesai yang tercatat.",
    });
    expect(text).toContain("Tidak direkomendasikan");
    expect(text).toContain("Stok kosong");
  });

  it("menampilkan catatan konfirmasi ketika tidak ada blocking reason tapi belum pasti", () => {
    const text = buildRecommendationReason({
      eligible: false,
      isRecommended: false,
      labels: [],
      eligibility: {
        eligible: false,
        blockingReasons: [],
        cautionNotes: ["Jangkauan area pengiriman supplier belum dikonfirmasi."],
      },
      performanceMessage:
        "Data pengiriman belum tersedia — belum ada pesanan selesai yang tercatat.",
    });
    expect(text).toContain("Belum dapat direkomendasikan");
    expect(text).toContain("Jangkauan area pengiriman");
  });

  it("selalu menyertakan pesan performa (transparansi R15), apa pun kondisinya", () => {
    const text = buildRecommendationReason({
      eligible: true,
      isRecommended: false,
      labels: [],
      eligibility: { eligible: true, blockingReasons: [], cautionNotes: [] },
      performanceMessage: "Estimasi tepat waktu 90%, berdasarkan 10 pengiriman.",
    });
    expect(text).toContain("Estimasi tepat waktu 90%, berdasarkan 10 pengiriman.");
  });
});
