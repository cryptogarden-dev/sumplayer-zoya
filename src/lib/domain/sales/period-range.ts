/**
 * Rentang periode untuk halaman Penjualan — semua dihitung dalam WIB
 * (Asia/Jakarta), bukan zona waktu server (UTC). Rentang bersifat
 * setengah-terbuka [from, to): `to` adalah awal hari/periode berikutnya,
 * jadi query memakai `gte: from, lt: to` tanpa perlu 23:59:59.
 */

export type SalesPeriod = "hari" | "minggu" | "bulan" | "semua" | "custom";

export interface PeriodRange {
  /** Awal rentang (inklusif), dalam UTC. */
  from: Date;
  /** Akhir rentang (eksklusif), dalam UTC. */
  to: Date;
  /** Label untuk ditampilkan, mis. "Bulan ini · November 2026". */
  label: string;
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const shortDate = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const monthYear = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  month: "long",
  year: "numeric",
});

/** Bagian tanggal (tahun/bulan/hari) dari `now` dalam WIB. */
function wibDateParts(now: Date): { year: number; month: number; day: number } {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  return {
    year: wib.getUTCFullYear(),
    month: wib.getUTCMonth(),
    day: wib.getUTCDate(),
  };
}

/** Awal hari WIB (00:00) untuk tanggal tahun/bulan/hari, sebagai UTC. */
function wibDayStart(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - WIB_OFFSET_MS);
}

function parseWibDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  // Tolak tanggal yang tidak ada (mis. 2026-02-30).
  const check = new Date(Date.UTC(year, month, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function rangeLabel(from: Date, to: Date): string {
  const lastDay = new Date(to.getTime() - DAY_MS);
  return from.getTime() === lastDay.getTime()
    ? shortDate.format(from)
    : `${shortDate.format(from)}–${shortDate.format(lastDay)}`;
}

/**
 * Rentang untuk satu periode. `null` berarti tanpa batas (Semua).
 * Rentang custom yang kosong / tidak valid jatuh kembali ke Bulan Ini
 * (periode bawaan halaman Penjualan).
 */
export function getPeriodRange(
  period: SalesPeriod,
  now: Date = new Date(),
  custom?: { from?: string; to?: string },
): PeriodRange | null {
  const { year, month, day } = wibDateParts(now);
  switch (period) {
    case "semua":
      return null;
    case "hari": {
      const from = wibDayStart(year, month, day);
      return {
        from,
        to: new Date(from.getTime() + DAY_MS),
        label: `Hari ini · ${shortDate.format(from)}`,
      };
    }
    case "minggu": {
      // Minggu berjalan Senin–Minggu (standar Indonesia).
      const weekday = new Date(Date.UTC(year, month, day)).getUTCDay(); // 0 = Minggu
      const mondayOffset = (weekday + 6) % 7;
      const from = wibDayStart(year, month, day - mondayOffset);
      const to = new Date(from.getTime() + 7 * DAY_MS);
      return { from, to, label: `Minggu ini · ${rangeLabel(from, to)}` };
    }
    case "bulan": {
      const from = wibDayStart(year, month, 1);
      const to = wibDayStart(year, month + 1, 1);
      return { from, to, label: `Bulan ini · ${monthYear.format(from)}` };
    }
    case "custom": {
      const fromParts = custom?.from ? parseWibDate(custom.from) : null;
      const toParts = custom?.to ? parseWibDate(custom.to) : null;
      if (!fromParts && !toParts) return getPeriodRange("bulan", now);
      const from = fromParts
        ? wibDayStart(fromParts.year, fromParts.month, fromParts.day)
        : wibDayStart(year, month, 1);
      const endParts = toParts ?? fromParts ?? { year, month, day };
      const to = wibDayStart(endParts.year, endParts.month, endParts.day + 1);
      if (to.getTime() <= from.getTime()) return getPeriodRange("bulan", now);
      return { from, to, label: rangeLabel(from, to) };
    }
  }
}
