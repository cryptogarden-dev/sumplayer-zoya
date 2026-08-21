import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { money, roundMoney } from "@/lib/domain/money/money";
import { InvalidMoneyError } from "@/lib/domain/errors/domain-errors";

describe("money()", () => {
  it("menerima nilai nol (uang boleh nol, bukan kuantitas fisik)", () => {
    expect(money(0).toNumber()).toBe(0);
  });

  it("menerima nilai positif", () => {
    expect(money(375_000).toNumber()).toBe(375_000);
  });

  it("menolak nilai negatif", () => {
    expect(() => money(-1)).toThrow(InvalidMoneyError);
  });

  it("menolak nilai yang tidak valid (NaN/Infinity)", () => {
    expect(() => money(Number.NaN)).toThrow(InvalidMoneyError);
    expect(() => money(Number.POSITIVE_INFINITY)).toThrow(InvalidMoneyError);
  });

  it("mengembalikan instance Decimal, bukan number biasa", () => {
    expect(money(100)).toBeInstanceOf(Decimal);
  });
});

describe("roundMoney() — kasus uji #23: aturan pembulatan terdokumentasi", () => {
  it("membulatkan 0,5 ke atas (round half up), bukan ke genap terdekat", () => {
    expect(roundMoney(2.5).toNumber()).toBe(3);
    expect(roundMoney(15000.5).toNumber()).toBe(15001);
  });

  it("membulatkan ke bawah jika desimal kurang dari 0,5", () => {
    expect(roundMoney(15000.4).toNumber()).toBe(15000);
  });

  it("membulatkan ke atas jika desimal 0,5 atau lebih", () => {
    expect(roundMoney(15000.6).toNumber()).toBe(15001);
  });

  it("mendukung jumlah desimal kustom", () => {
    expect(roundMoney(17000.125, 2).toNumber()).toBe(17000.13);
  });

  it("tidak mengubah nilai yang sudah bulat", () => {
    expect(roundMoney(15000).toNumber()).toBe(15000);
  });
});
