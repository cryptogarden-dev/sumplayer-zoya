/**
 * Titik masuk tunggal mesin perhitungan (Tahap 2).
 *
 * Seluruh isi `src/lib/domain/**` adalah fungsi murni: tidak mengimpor
 * apa pun dari `src/app`, `src/components`, atau `src/lib/db` (Prisma).
 * Ini memungkinkan seluruh rumus diuji tanpa server, database, atau UI
 * berjalan (lihat docs/ARCHITECTURE.md §6 dan docs/CALCULATION_ENGINE.md).
 */

export * from "@/lib/domain/errors/domain-errors";

export * from "@/lib/domain/money/money";

export * from "@/lib/domain/units/types";
export * from "@/lib/domain/units/constants";
export * from "@/lib/domain/units/convert";
export * from "@/lib/domain/units/packaging";

export * from "@/lib/domain/pricing/types";
export * from "@/lib/domain/pricing/tax";
export * from "@/lib/domain/pricing/unit-price";
export * from "@/lib/domain/pricing/packages";
export * from "@/lib/domain/pricing/stock";
export * from "@/lib/domain/pricing/shipping";
export * from "@/lib/domain/pricing/subtotal";
export * from "@/lib/domain/pricing/order-total";
export * from "@/lib/domain/pricing/price-change";
export * from "@/lib/domain/pricing/shipping-area";

export * from "@/lib/domain/freshness/data-freshness";

export * from "@/lib/domain/scheduling/delivery-estimate";

export * from "@/lib/domain/performance/on-time-rate";

export * from "@/lib/domain/recommendation/config";
export * from "@/lib/domain/recommendation/location";
export * from "@/lib/domain/recommendation/eligibility";
export * from "@/lib/domain/recommendation/score";
export * from "@/lib/domain/recommendation/labels";
export * from "@/lib/domain/recommendation/reason";

export * from "@/lib/domain/whatsapp/format-order";

export * from "@/lib/domain/orders/types";
