import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

/**
 * Estimasi tanggal kirim & tiba (Tahap 4, R12 "estimasi dikirim dan
 * tiba", R14 "memenuhi jadwal kebutuhan").
 *
 * Fungsi murni: tidak bergantung pada database. Hari pengiriman rutin
 * supplier (`deliveryDaysOfWeek`, dari `supplier_delivery_schedules`)
 * dipakai untuk mencari tanggal kirim terdekat mulai hari ini; bila
 * supplier tidak mendaftarkan jadwal tertentu (array kosong), tanggal
 * kirim diasumsikan hari ini (tidak ada batasan hari yang diketahui —
 * BUKAN berarti "kapan saja pasti bisa", hanya "tidak ada info
 * pembatasan").
 */
export interface DeliveryEstimateInput {
  /** Tanggal referensi ("hari ini"/tanggal pesanan akan dibuat). */
  today: Date;
  /** Hari pengiriman rutin (0 = Minggu ... 6 = Sabtu). Kosong = tidak ada info. */
  deliveryDaysOfWeek: readonly number[];
  leadTimeDaysMin: number;
  leadTimeDaysMax: number;
}

export interface DeliveryEstimateResult {
  estimatedShipDate: Date;
  estimatedArrivalMin: Date;
  estimatedArrivalMax: Date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function estimateDelivery(input: DeliveryEstimateInput): DeliveryEstimateResult {
  if (input.leadTimeDaysMin < 0 || input.leadTimeDaysMax < 0) {
    throw new InvalidQuantityError("Estimasi lama pengiriman tidak boleh negatif.");
  }
  if (input.leadTimeDaysMax < input.leadTimeDaysMin) {
    throw new InvalidQuantityError("Estimasi pengiriman maksimum tidak boleh kurang dari minimum.");
  }

  const today = startOfDay(input.today);

  let shipDate = today;
  if (input.deliveryDaysOfWeek.length > 0) {
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDays(today, offset);
      if (input.deliveryDaysOfWeek.includes(candidate.getDay())) {
        shipDate = candidate;
        break;
      }
    }
  }

  return {
    estimatedShipDate: shipDate,
    estimatedArrivalMin: addDays(shipDate, input.leadTimeDaysMin),
    estimatedArrivalMax: addDays(shipDate, input.leadTimeDaysMax),
  };
}

/** Membandingkan tanggal tiba maksimum terhadap tanggal kebutuhan (bagian per bagian, mengabaikan jam). */
export function arrivesByNeededDate(estimatedArrivalMax: Date, neededByDate: Date): boolean {
  return startOfDay(estimatedArrivalMax).getTime() <= startOfDay(neededByDate).getTime();
}
