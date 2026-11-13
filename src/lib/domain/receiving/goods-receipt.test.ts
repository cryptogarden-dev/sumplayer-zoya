import { describe, expect, it } from "vitest";
import {
  computeReceiptCompleteness,
  computeStockAddition,
} from "@/lib/domain/receiving/goods-receipt";

describe("computeStockAddition (R18)", () => {
  it("mengalikan jumlah kemasan baik dengan isi kemasan (satuan dasar)", () => {
    // 2 karung baik x 5 kg/karung = 10 kg masuk stok toko.
    expect(computeStockAddition(2, 5).toNumber()).toBe(10);
  });

  it("barang rusak tidak menambah stok (hanya yang baik dihitung)", () => {
    // Pemanggil hanya meneruskan goodQty; fungsi ini sendiri tidak
    // tahu soal rusak — diuji di sini bahwa 0 kemasan baik = 0 stok.
    expect(computeStockAddition(0, 5).toNumber()).toBe(0);
  });

  it("mendukung pecahan kemasan (mis. 1,5 karung x 25 kg)", () => {
    expect(computeStockAddition(1.5, 25).toNumber()).toBe(37.5);
  });

  it("menolak jumlah negatif", () => {
    expect(() => computeStockAddition(-1, 5)).toThrow();
    expect(() => computeStockAddition(1, -5)).toThrow();
  });
});

describe("computeReceiptCompleteness (R18)", () => {
  it("LENGKAP bila semua baris diterima >= yang dipesan", () => {
    const result = computeReceiptCompleteness([
      { orderedQty: 2, receivedQty: 2 },
      { orderedQty: 5, receivedQty: 6 },
    ]);
    expect(result.isPartial).toBe(false);
    expect(result.overallCompleteness).toBe("LENGKAP");
  });

  it("KURANG bila satu baris saja diterima kurang dari yang dipesan", () => {
    const result = computeReceiptCompleteness([
      { orderedQty: 2, receivedQty: 2 },
      { orderedQty: 5, receivedQty: 3 },
    ]);
    expect(result.isPartial).toBe(true);
    expect(result.overallCompleteness).toBe("KURANG");
  });

  it("KURANG bila ada baris yang tidak diterima sama sekali", () => {
    const result = computeReceiptCompleteness([{ orderedQty: 2, receivedQty: 0 }]);
    expect(result.isPartial).toBe(true);
    expect(result.overallCompleteness).toBe("KURANG");
  });
});
