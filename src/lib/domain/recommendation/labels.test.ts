import { describe, expect, it } from "vitest";
import { computeLabels, LABEL, type LabelInputRow } from "@/lib/domain/recommendation/labels";

function baseRow(overrides: Partial<LabelInputRow> & { id: string }): LabelInputRow {
  return {
    finalPricePerBaseUnit: 15000,
    totalCost: 375000,
    isFreeShipping: false,
    estimatedArrivalMax: new Date("2026-08-20"),
    proximityScore: null,
    availabilityStatus: "TERSEDIA",
    needsConfirmation: false,
    eligible: true,
    score: 0.5,
    ...overrides,
  };
}

describe("computeLabels (R13)", () => {
  it("memberi label harga satuan termurah & total termurah pada baris dengan nilai terkecil", () => {
    const rows = [
      baseRow({ id: "A", finalPricePerBaseUnit: 15000, totalCost: 400000 }),
      baseRow({ id: "B", finalPricePerBaseUnit: 14000, totalCost: 375000 }),
    ];
    const labels = computeLabels(rows);
    expect(labels.get("B")).toContain(LABEL.CHEAPEST_UNIT_PRICE);
    expect(labels.get("B")).toContain(LABEL.CHEAPEST_TOTAL);
    expect(labels.get("A")).not.toContain(LABEL.CHEAPEST_UNIT_PRICE);
  });

  it("baris dengan finalPricePerBaseUnit null (ongkir belum diketahui) tidak pernah mendapat label termurah", () => {
    const rows = [
      baseRow({ id: "A", finalPricePerBaseUnit: null, totalCost: null }),
      baseRow({ id: "B", finalPricePerBaseUnit: 20000, totalCost: 500000 }),
    ];
    const labels = computeLabels(rows);
    expect(labels.get("A")).not.toContain(LABEL.CHEAPEST_UNIT_PRICE);
    expect(labels.get("B")).toContain(LABEL.CHEAPEST_UNIT_PRICE);
  });

  it("label gratis ongkir independen dari label lain", () => {
    const rows = [baseRow({ id: "A", isFreeShipping: true })];
    expect(computeLabels(rows).get("A")).toContain(LABEL.FREE_SHIPPING);
  });

  it("pengiriman tercepat berdasarkan estimasi tiba maksimum paling awal", () => {
    const rows = [
      baseRow({ id: "A", estimatedArrivalMax: new Date("2026-08-25") }),
      baseRow({ id: "B", estimatedArrivalMax: new Date("2026-08-20") }),
    ];
    const labels = computeLabels(rows);
    expect(labels.get("B")).toContain(LABEL.FASTEST_DELIVERY);
    expect(labels.get("A")).not.toContain(LABEL.FASTEST_DELIVERY);
  });

  it("tidak memberi label 'Paling Dekat' jika tidak ada satu pun data kedekatan (semua null)", () => {
    const rows = [
      baseRow({ id: "A", proximityScore: null }),
      baseRow({ id: "B", proximityScore: null }),
    ];
    const labels = computeLabels(rows);
    expect(labels.get("A")).not.toContain(LABEL.CLOSEST);
    expect(labels.get("B")).not.toContain(LABEL.CLOSEST);
  });

  it("memberi label 'Paling Dekat' pada skor kedekatan terkecil jika tersedia", () => {
    const rows = [baseRow({ id: "A", proximityScore: 1 }), baseRow({ id: "B", proximityScore: 0 })];
    const labels = computeLabels(rows);
    expect(labels.get("B")).toContain(LABEL.CLOSEST);
  });

  it("label stok mengikuti status ketersediaan", () => {
    const rows = [
      baseRow({ id: "A", availabilityStatus: "TERSEDIA" }),
      baseRow({ id: "B", availabilityStatus: "STOK_TERBATAS" }),
      baseRow({ id: "C", availabilityStatus: "KOSONG" }),
    ];
    const labels = computeLabels(rows);
    expect(labels.get("A")).toContain(LABEL.STOCK_AVAILABLE);
    expect(labels.get("B")).toContain(LABEL.STOCK_LIMITED);
    expect(labels.get("C")).not.toContain(LABEL.STOCK_AVAILABLE);
    expect(labels.get("C")).not.toContain(LABEL.STOCK_LIMITED);
  });

  it("baris tidak layak (eligible=false) TIDAK PERNAH mendapat label 'Direkomendasikan', walau skornya tertinggi", () => {
    const rows = [
      baseRow({ id: "A", eligible: false, score: 0.99 }),
      baseRow({ id: "B", eligible: true, score: 0.4 }),
    ];
    const labels = computeLabels(rows);
    expect(labels.get("A")).not.toContain(LABEL.RECOMMENDED);
    expect(labels.get("B")).toContain(LABEL.RECOMMENDED);
  });

  it("tidak ada satu pun baris layak -> tidak ada yang berlabel 'Direkomendasikan'", () => {
    const rows = [baseRow({ id: "A", eligible: false }), baseRow({ id: "B", eligible: false })];
    const labels = computeLabels(rows);
    expect(labels.get("A")).not.toContain(LABEL.RECOMMENDED);
    expect(labels.get("B")).not.toContain(LABEL.RECOMMENDED);
  });

  it("label 'Perlu Konfirmasi' muncul sesuai flag, terlepas dari kelayakan", () => {
    const rows = [baseRow({ id: "A", needsConfirmation: true })];
    expect(computeLabels(rows).get("A")).toContain(LABEL.NEEDS_CONFIRMATION);
  });
});
