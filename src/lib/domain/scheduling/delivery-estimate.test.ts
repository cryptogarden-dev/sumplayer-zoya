import { describe, expect, it } from "vitest";
import { arrivesByNeededDate, estimateDelivery } from "@/lib/domain/scheduling/delivery-estimate";
import { InvalidQuantityError } from "@/lib/domain/errors/domain-errors";

describe("estimateDelivery", () => {
  it("tanpa jadwal pengiriman terdaftar -> kirim hari ini + lead time", () => {
    const today = new Date("2026-08-18T10:00:00"); // Selasa
    const result = estimateDelivery({
      today,
      deliveryDaysOfWeek: [],
      leadTimeDaysMin: 1,
      leadTimeDaysMax: 3,
    });
    expect(result.estimatedShipDate.toDateString()).toBe(new Date("2026-08-18").toDateString());
    expect(result.estimatedArrivalMin.toDateString()).toBe(new Date("2026-08-19").toDateString());
    expect(result.estimatedArrivalMax.toDateString()).toBe(new Date("2026-08-21").toDateString());
  });

  it("dengan jadwal pengiriman -> mencari hari kirim terdekat sesuai jadwal", () => {
    const today = new Date("2026-08-18T10:00:00"); // Selasa (day 2)
    // Jadwal kirim hanya Kamis (4) dan Sabtu (6).
    const result = estimateDelivery({
      today,
      deliveryDaysOfWeek: [4, 6],
      leadTimeDaysMin: 0,
      leadTimeDaysMax: 1,
    });
    expect(result.estimatedShipDate.getDay()).toBe(4);
    expect(result.estimatedShipDate.toDateString()).toBe(new Date("2026-08-20").toDateString());
  });

  it("jika hari ini sudah termasuk jadwal kirim, kirim hari ini juga", () => {
    const today = new Date("2026-08-18T10:00:00"); // Selasa (day 2)
    const result = estimateDelivery({
      today,
      deliveryDaysOfWeek: [2, 5],
      leadTimeDaysMin: 0,
      leadTimeDaysMax: 0,
    });
    expect(result.estimatedShipDate.toDateString()).toBe(today.toDateString());
  });

  it("menolak lead time negatif atau max < min", () => {
    expect(() =>
      estimateDelivery({
        today: new Date(),
        deliveryDaysOfWeek: [],
        leadTimeDaysMin: -1,
        leadTimeDaysMax: 2,
      }),
    ).toThrow(InvalidQuantityError);
    expect(() =>
      estimateDelivery({
        today: new Date(),
        deliveryDaysOfWeek: [],
        leadTimeDaysMin: 5,
        leadTimeDaysMax: 2,
      }),
    ).toThrow(InvalidQuantityError);
  });
});

describe("arrivesByNeededDate", () => {
  it("tepat pada tanggal kebutuhan dianggap memenuhi (<=)", () => {
    const neededByDate = new Date("2026-08-25");
    expect(arrivesByNeededDate(new Date("2026-08-25T23:00:00"), neededByDate)).toBe(true);
  });

  it("melewati tanggal kebutuhan dianggap tidak memenuhi", () => {
    const neededByDate = new Date("2026-08-25");
    expect(arrivesByNeededDate(new Date("2026-08-26"), neededByDate)).toBe(false);
  });
});
