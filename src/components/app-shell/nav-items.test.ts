import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";

describe("NAV_ITEMS (R25 - navigasi utama dibatasi)", () => {
  it("hanya berisi tepat 5 menu utama", () => {
    expect(NAV_ITEMS).toHaveLength(5);
  });

  it("berisi Supplier, Produk, Stok Toko, Bandingkan, dan Pesanan dengan urutan yang benar", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Supplier",
      "Produk",
      "Stok Toko",
      "Bandingkan",
      "Pesanan",
    ]);
  });

  it("setiap item memiliki href unik yang diawali garis miring", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      expect(href.startsWith("/")).toBe(true);
    }
  });
});
