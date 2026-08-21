/**
 * Tipe data hasil `/api/comparison` di sisi klien (Tahap 4, R12). Sengaja
 * dideklarasikan ulang (bukan mengimpor dari `lib/server/comparison`)
 * agar komponen klien tidak bergantung pada modul `server-only`. Bentuk
 * data HARUS tetap sinkron dengan `serializeComparisonResult()` di
 * `src/lib/server/comparison/build-comparison.ts`.
 */
export interface ComparisonApiResponse {
  product: {
    id: string;
    productName: string;
    sku: string;
    unitFamily: "WEIGHT" | "VOLUME" | "COUNT";
    baseUnit: "KILOGRAM" | "LITER" | "PCS";
  };
  neededQuantityInBaseUnit: string;
  rows: ComparisonRowDto[];
}

export interface ComparisonRowDto {
  offerId: string;
  supplier: {
    id: string;
    name: string;
    province: string;
    city: string;
    district: string | null;
    whatsappNumber: string | null;
    phoneNumber: string | null;
    contactName: string | null;
  };
  packaging: {
    packageType: string;
    itemsPerPackage: string;
    contentPerItem: string;
    contentUnit: string;
    totalPackageContent: string;
    baseUnit: string;
    minPurchasePackages: string;
    purchaseMultiplePackages: string;
    supplierSkuOrName: string | null;
  };
  price: {
    pricePerPackage: string;
    taxStatus: "INCLUDED" | "EXCLUDED" | "NONE";
    taxRatePercent: string | null;
    pricePerPackageAfterTax: string;
    pricePerBaseUnitAfterTax: string;
    updatedAt: string;
    isStale: boolean;
    freshnessMessage: string;
  };
  stock: {
    availabilityStatus: "TERSEDIA" | "STOK_TERBATAS" | "KOSONG" | "PRE_ORDER" | "PERLU_KONFIRMASI";
    stockQty: string | null;
    updatedAt: string | null;
    meetsNeed: boolean;
    isCertain: boolean;
    reason: string;
    isStale: boolean | null;
    freshnessMessage: string | null;
  };
  purchase: {
    packagesRequiredRaw: string;
    packagesToBuy: string;
    actualQuantityInBaseUnit: string;
    excessQuantityInBaseUnit: string;
  };
  money: {
    subtotalAfterTax: string;
    shippingMode: string | null;
    shippingLabel: string;
    shippingFee: string | null;
    isFreeShipping: boolean;
    requiresShippingConfirmation: boolean;
    totalCost: string | null;
    finalPricePerBaseUnit: string | null;
  };
  delivery: {
    leadTimeDaysMin: number;
    leadTimeDaysMax: number;
    deliveryDaysOfWeek: number[];
    estimatedShipDate: string;
    estimatedArrivalMin: string;
    estimatedArrivalMax: string;
    arrivesInTime: boolean;
  };
  servesDestination: boolean | "UNKNOWN";
  proximity: { score: number | null; level: "CITY" | "PROVINCE" | "NONE" };
  reliability: {
    hasHistory: boolean;
    hasEnoughData: boolean;
    ratePercent: number | null;
    completedCount: number;
    message: string;
  };
  eligible: boolean;
  blockingReasons: string[];
  cautionNotes: string[];
  needsConfirmation: boolean;
  labels: string[];
  reasonText: string;
  score: number;
}

export interface ProductOption {
  id: string;
  productName: string;
  sku: string;
  unitFamily: "WEIGHT" | "VOLUME" | "COUNT";
}

export type SortKey = "unitPrice" | "totalCost" | "arrival" | "distance" | "reliability";

export interface ComparisonFiltersState {
  onlyAvailable: boolean;
  onlyFreeShipping: boolean;
  onlyServesDestination: boolean;
  onlyArrivesInTime: boolean;
}
