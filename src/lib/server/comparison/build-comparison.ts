import "server-only";
import { Decimal } from "decimal.js";
import {
  assertSameFamily,
  calculateOrderTotal,
  calculatePricePerBaseUnit,
  calculatePurchaseQuantity,
  calculateShipping,
  calculateSubtotal,
  computeLabels,
  buildRecommendationReason,
  estimateOnTimeRate,
  evaluateEligibility,
  evaluateFreshness,
  evaluateProximity,
  evaluateServesDestination,
  evaluateStock,
  resolveAreaFee,
  scoreCandidates,
  toBaseUnit,
  AVAILABILITY_PROXY_SCORES,
  LABEL,
  type LabelInputRow,
  type LabelText,
} from "@/lib/domain";
import { estimateDelivery, arrivesByNeededDate } from "@/lib/domain/scheduling/delivery-estimate";
import type { AvailabilityStatus, ShippingMode, TaxStatus } from "@/lib/domain/pricing/types";
import type {
  BaseUnit,
  MeasurementUnit,
  PackagingType,
  UnitFamily,
} from "@/lib/domain/units/types";
import { getProductById } from "@/lib/server/repositories/product-repository";
import {
  listOffersForComparison,
  type OfferForComparison,
} from "@/lib/server/repositories/supplier-product-repository";
import { getStaleDataThresholdDays } from "@/lib/server/repositories/business-settings-repository";

export class ProductNotFoundError extends Error {
  constructor() {
    super("Produk tidak ditemukan untuk bisnis ini.");
    this.name = "ProductNotFoundError";
  }
}

export interface ComparisonDestination {
  province: string;
  city?: string;
  district?: string;
}

export interface BuildComparisonInput {
  businessId: string;
  productId: string;
  neededQuantity: number;
  neededUnit: MeasurementUnit;
  destination: ComparisonDestination;
  neededByDate: Date;
  /** Tanggal referensi ("hari ini"). Parameter opsional untuk pengujian deterministik. */
  today?: Date;
}

export interface ComparisonRow {
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
    packageType: PackagingType;
    itemsPerPackage: Decimal;
    contentPerItem: Decimal;
    contentUnit: MeasurementUnit;
    totalPackageContent: Decimal;
    baseUnit: BaseUnit;
    minPurchasePackages: Decimal;
    purchaseMultiplePackages: Decimal;
    supplierSkuOrName: string | null;
  };
  price: {
    pricePerPackage: Decimal;
    taxStatus: TaxStatus;
    taxRatePercent: Decimal | null;
    pricePerPackageAfterTax: Decimal;
    pricePerBaseUnitAfterTax: Decimal;
    updatedAt: Date;
    isStale: boolean;
    freshnessMessage: string;
  };
  stock: {
    availabilityStatus: AvailabilityStatus;
    stockQty: Decimal | null;
    updatedAt: Date | null;
    meetsNeed: boolean;
    isCertain: boolean;
    reason: string;
    isStale: boolean | null;
    freshnessMessage: string | null;
  };
  purchase: {
    packagesRequiredRaw: Decimal;
    packagesToBuy: Decimal;
    actualQuantityInBaseUnit: Decimal;
    excessQuantityInBaseUnit: Decimal;
  };
  money: {
    subtotalAfterTax: Decimal;
    shippingMode: ShippingMode | null;
    shippingLabel: string;
    shippingFee: Decimal | null;
    isFreeShipping: boolean;
    requiresShippingConfirmation: boolean;
    totalCost: Decimal | null;
    finalPricePerBaseUnit: Decimal | null;
  };
  delivery: {
    leadTimeDaysMin: number;
    leadTimeDaysMax: number;
    deliveryDaysOfWeek: number[];
    estimatedShipDate: Date;
    estimatedArrivalMin: Date;
    estimatedArrivalMax: Date;
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
  labels: LabelText[];
  reasonText: string;
  score: number;
}

export interface ComparisonResult {
  product: {
    id: string;
    productName: string;
    sku: string;
    unitFamily: UnitFamily;
    baseUnit: BaseUnit;
  };
  neededQuantityInBaseUnit: Decimal;
  rows: ComparisonRow[];
}

function availabilityProxyScore(stock: { meetsNeed: boolean; isCertain: boolean }): number {
  if (stock.meetsNeed && stock.isCertain) return AVAILABILITY_PROXY_SCORES.SUFFICIENT_AND_CERTAIN;
  if (stock.meetsNeed && !stock.isCertain)
    return AVAILABILITY_PROXY_SCORES.SUFFICIENT_BUT_UNCERTAIN;
  if (!stock.meetsNeed && !stock.isCertain) return AVAILABILITY_PROXY_SCORES.INSUFFICIENT_UNCERTAIN;
  return AVAILABILITY_PROXY_SCORES.INSUFFICIENT_CERTAIN;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface RowContext {
  offer: OfferForComparison;
  purchase: ReturnType<typeof calculatePurchaseQuantity>;
  stockEval: ReturnType<typeof evaluateStock>;
  subtotal: ReturnType<typeof calculateSubtotal>;
  shipping: ReturnType<typeof calculateShipping>;
  orderTotal: ReturnType<typeof calculateOrderTotal>;
  delivery: ReturnType<typeof estimateDelivery>;
  arrivesInTime: boolean;
  servesDestination: boolean | "UNKNOWN";
  proximity: ReturnType<typeof evaluateProximity>;
  reliability: ReturnType<typeof estimateOnTimeRate>;
  priceFreshness: ReturnType<typeof evaluateFreshness>;
  stockFreshness: ReturnType<typeof evaluateFreshness> | null;
  pricePerBaseUnitAfterTax: Decimal;
  shippingMode: ShippingMode | null;
}

function buildRowContext(
  offer: OfferForComparison,
  input: {
    neededQuantityInBaseUnit: Decimal;
    destination: ComparisonDestination;
    neededByDate: Date;
    today: Date;
    staleDataThresholdDays: number;
  },
): RowContext {
  const latestPrice = offer.prices[0];
  if (!latestPrice) {
    throw new Error(`Penawaran ${offer.id} tidak memiliki data harga (data tidak konsisten).`);
  }

  const purchase = calculatePurchaseQuantity({
    neededQuantityInBaseUnit: input.neededQuantityInBaseUnit,
    contentPerPackageInBaseUnit: offer.totalPackageContent,
    minimumPurchasePackages: offer.minPurchasePackages,
    purchaseMultiple: offer.purchaseMultiplePackages,
  });

  const stockEval = evaluateStock({
    availabilityStatus: offer.stock?.availabilityStatus ?? "PERLU_KONFIRMASI",
    availablePackages: offer.stock?.stockQty ?? undefined,
    packagesNeeded: purchase.packagesToBuy,
  });

  const subtotal = calculateSubtotal({
    packagesToBuy: purchase.packagesToBuy,
    pricePerPackage: latestPrice.pricePerPackage,
    taxStatus: latestPrice.taxStatus,
    taxRatePercent: latestPrice.taxRateValueSnapshot ?? 0,
  });

  const shippingRule = offer.supplier.shippingRule;
  let shipping: ReturnType<typeof calculateShipping>;
  let shippingMode: ShippingMode | null = null;

  if (!shippingRule || !shippingRule.isActive) {
    shipping = {
      fee: null,
      isFreeShipping: false,
      requiresConfirmation: true,
      isPickup: false,
      label: "Perlu Konfirmasi (belum diatur)",
    };
  } else {
    shippingMode = shippingRule.ruleType;
    if (shippingRule.ruleType === "BERDASARKAN_AREA") {
      const areaFee = resolveAreaFee(shippingRule.areas, input.destination);
      shipping =
        areaFee === null
          ? {
              fee: null,
              isFreeShipping: false,
              requiresConfirmation: true,
              isPickup: false,
              label: "Perlu Konfirmasi (area belum diatur)",
            }
          : calculateShipping({
              mode: "BERDASARKAN_AREA",
              subtotal: subtotal.subtotalAfterTax,
              areaFee,
            });
    } else {
      shipping = calculateShipping({
        mode: shippingRule.ruleType,
        subtotal: subtotal.subtotalAfterTax,
        freeShippingMinAmount: shippingRule.freeShippingMinAmount ?? undefined,
        flatFee: shippingRule.flatFee ?? undefined,
      });
    }
  }

  const orderTotal = calculateOrderTotal({
    subtotalAfterTax: subtotal.subtotalAfterTax,
    shipping,
    actualQuantityInBaseUnit: purchase.actualQuantityInBaseUnit,
  });

  const deliveryDaysOfWeek = offer.supplier.deliverySchedules.map((s) => s.dayOfWeek);
  const leadTimeDaysMin = offer.estimatedDeliveryDaysMin ?? offer.supplier.leadTimeDaysMin;
  const leadTimeDaysMax = offer.estimatedDeliveryDaysMax ?? offer.supplier.leadTimeDaysMax;
  const delivery = estimateDelivery({
    today: input.today,
    deliveryDaysOfWeek,
    leadTimeDaysMin,
    leadTimeDaysMax,
  });
  const arrivesInTime = arrivesByNeededDate(delivery.estimatedArrivalMax, input.neededByDate);

  const servesDestination = evaluateServesDestination(
    offer.supplier.deliveryAreas,
    input.destination,
  );
  const proximity = evaluateProximity(
    offer.supplier.city,
    offer.supplier.deliveryAreas,
    input.destination,
  );

  // Belum ada mekanisme riwayat pengiriman (tabel `supplier_performance`
  // adalah Tahap 5, di luar cakupan Tahap 4) — SELALU 0 data untuk saat
  // ini. Parameter tetap diteruskan secara eksplisit (bukan hardcode di
  // dalam rumus `estimateOnTimeRate`) agar begitu Tahap 5 selesai, hanya
  // baris ini yang perlu diubah untuk membaca data nyata.
  const reliability = estimateOnTimeRate({ onTimeCount: 0, completedCount: 0 });

  const priceFreshness = evaluateFreshness({
    lastUpdatedAt: latestPrice.createdAt,
    thresholdDays: input.staleDataThresholdDays,
    now: input.today,
  });
  const stockFreshness = offer.stock
    ? evaluateFreshness({
        lastUpdatedAt: offer.stock.updatedAt,
        thresholdDays: input.staleDataThresholdDays,
        now: input.today,
      })
    : null;

  const pricePerBaseUnitAfterTax = calculatePricePerBaseUnit(
    subtotal.pricePerPackageAfterTax,
    offer.totalPackageContent,
  );

  return {
    offer,
    purchase,
    stockEval,
    subtotal,
    shipping,
    orderTotal,
    delivery,
    arrivesInTime,
    servesDestination,
    proximity,
    reliability,
    priceFreshness,
    stockFreshness,
    pricePerBaseUnitAfterTax,
    shippingMode,
  };
}

function decimalOrNull(value: Decimal | null): string | null {
  return value === null ? null : value.toString();
}

/**
 * Mengubah hasil perhitungan (memakai `Decimal`/`Date`) menjadi struktur
 * JSON-aman untuk respons API — presisi tetap terjaga karena nilai uang
 * dikirim sebagai STRING (bukan `number`), sesuai R27 (jangan pernah
 * memakai float untuk uang, termasuk saat serialisasi).
 */
export function serializeComparisonResult(result: ComparisonResult) {
  return {
    product: result.product,
    neededQuantityInBaseUnit: result.neededQuantityInBaseUnit.toString(),
    rows: result.rows.map((row) => ({
      offerId: row.offerId,
      supplier: row.supplier,
      packaging: {
        ...row.packaging,
        itemsPerPackage: row.packaging.itemsPerPackage.toString(),
        contentPerItem: row.packaging.contentPerItem.toString(),
        totalPackageContent: row.packaging.totalPackageContent.toString(),
        minPurchasePackages: row.packaging.minPurchasePackages.toString(),
        purchaseMultiplePackages: row.packaging.purchaseMultiplePackages.toString(),
      },
      price: {
        ...row.price,
        pricePerPackage: row.price.pricePerPackage.toString(),
        taxRatePercent: decimalOrNull(row.price.taxRatePercent),
        pricePerPackageAfterTax: row.price.pricePerPackageAfterTax.toString(),
        pricePerBaseUnitAfterTax: row.price.pricePerBaseUnitAfterTax.toString(),
        updatedAt: row.price.updatedAt.toISOString(),
      },
      stock: {
        ...row.stock,
        stockQty: decimalOrNull(row.stock.stockQty),
        updatedAt: row.stock.updatedAt ? row.stock.updatedAt.toISOString() : null,
      },
      purchase: {
        packagesRequiredRaw: row.purchase.packagesRequiredRaw.toString(),
        packagesToBuy: row.purchase.packagesToBuy.toString(),
        actualQuantityInBaseUnit: row.purchase.actualQuantityInBaseUnit.toString(),
        excessQuantityInBaseUnit: row.purchase.excessQuantityInBaseUnit.toString(),
      },
      money: {
        ...row.money,
        subtotalAfterTax: row.money.subtotalAfterTax.toString(),
        shippingFee: decimalOrNull(row.money.shippingFee),
        totalCost: decimalOrNull(row.money.totalCost),
        finalPricePerBaseUnit: decimalOrNull(row.money.finalPricePerBaseUnit),
      },
      delivery: {
        ...row.delivery,
        estimatedShipDate: row.delivery.estimatedShipDate.toISOString(),
        estimatedArrivalMin: row.delivery.estimatedArrivalMin.toISOString(),
        estimatedArrivalMax: row.delivery.estimatedArrivalMax.toISOString(),
      },
      servesDestination: row.servesDestination,
      proximity: row.proximity,
      reliability: row.reliability,
      eligible: row.eligible,
      blockingReasons: row.blockingReasons,
      cautionNotes: row.cautionNotes,
      needsConfirmation: row.needsConfirmation,
      labels: row.labels,
      reasonText: row.reasonText,
      score: row.score,
    })),
  };
}

export type SerializedComparisonResult = ReturnType<typeof serializeComparisonResult>;
export type SerializedComparisonRow = SerializedComparisonResult["rows"][number];

export async function buildComparison(input: BuildComparisonInput): Promise<ComparisonResult> {
  const product = await getProductById(input.businessId, input.productId);
  if (!product) {
    throw new ProductNotFoundError();
  }

  const neededBase = toBaseUnit(input.neededQuantity, input.neededUnit);
  // R05: satuan berbeda family TIDAK PERNAH dibandingkan. Melempar
  // `IncompatibleUnitError` bila satuan kebutuhan tidak sesuai dimensi
  // produk (mis. memilih "liter" untuk produk berbasis berat).
  assertSameFamily(neededBase.family, product.unitFamily);

  const staleDataThresholdDays = await getStaleDataThresholdDays(input.businessId);
  const today = input.today ?? new Date();
  const offers = await listOffersForComparison(input.businessId, input.productId);

  const contexts = offers.map((offer) =>
    buildRowContext(offer, {
      neededQuantityInBaseUnit: neededBase.quantity,
      destination: input.destination,
      neededByDate: input.neededByDate,
      today,
      staleDataThresholdDays,
    }),
  );

  const eligibilities = contexts.map((ctx) => {
    const cautionNotes: string[] = [];
    if (ctx.priceFreshness.isStale) cautionNotes.push(`Harga: ${ctx.priceFreshness.message}`);
    if (ctx.stockFreshness?.isStale) cautionNotes.push(`Stok: ${ctx.stockFreshness.message}`);
    if (ctx.shipping.requiresConfirmation) {
      cautionNotes.push(`Ongkir belum dapat dipastikan (${ctx.shipping.label}).`);
    }

    return evaluateEligibility({
      servesDestination: ctx.servesDestination,
      stock: ctx.stockEval,
      arrivesInTime: ctx.arrivesInTime,
      additionalCautionNotes: cautionNotes,
    });
  });

  const scoreInputs = contexts.map((ctx) => ({
    id: ctx.offer.id,
    totalCost: ctx.orderTotal.totalCost,
    reliability: ctx.reliability.hasHistory
      ? ctx.reliability.rate.toNumber()
      : availabilityProxyScore(ctx.stockEval),
    speedDays: Math.max(
      0,
      Math.round((ctx.delivery.estimatedArrivalMax.getTime() - today.getTime()) / MS_PER_DAY),
    ),
  }));
  const scores = scoreCandidates(scoreInputs);
  const scoreById = new Map(scores.map((s) => [s.id, s.score]));

  const labelInputRows: LabelInputRow[] = contexts.map((ctx, index) => ({
    id: ctx.offer.id,
    finalPricePerBaseUnit: ctx.orderTotal.finalPricePerBaseUnit,
    totalCost: ctx.orderTotal.totalCost,
    isFreeShipping: ctx.shipping.isFreeShipping,
    estimatedArrivalMax: ctx.delivery.estimatedArrivalMax,
    proximityScore: ctx.proximity.score,
    availabilityStatus: ctx.offer.stock?.availabilityStatus ?? "PERLU_KONFIRMASI",
    needsConfirmation:
      eligibilities[index]!.cautionNotes.length > 0 || ctx.shipping.requiresConfirmation,
    eligible: eligibilities[index]!.eligible,
    score: scoreById.get(ctx.offer.id) ?? 0,
  }));
  const labelsById = computeLabels(labelInputRows);

  const rows: ComparisonRow[] = contexts.map((ctx, index) => {
    const offer = ctx.offer;
    const eligibility = eligibilities[index]!;
    const labels = labelsById.get(offer.id) ?? [];
    const isRecommended = labels.includes(LABEL.RECOMMENDED);
    const needsConfirmation =
      eligibility.cautionNotes.length > 0 || ctx.shipping.requiresConfirmation;

    const reasonText = buildRecommendationReason({
      eligible: eligibility.eligible,
      isRecommended,
      labels,
      eligibility,
      performanceMessage: ctx.reliability.message,
    });

    return {
      offerId: offer.id,
      supplier: {
        id: offer.supplier.id,
        name: offer.supplier.supplierName,
        province: offer.supplier.province,
        city: offer.supplier.city,
        district: offer.supplier.district,
        whatsappNumber: offer.supplier.whatsappNumber,
        phoneNumber: offer.supplier.phoneNumber,
        contactName: offer.supplier.contactName,
      },
      packaging: {
        packageType: offer.packageType,
        itemsPerPackage: new Decimal(offer.itemsPerPackage),
        contentPerItem: new Decimal(offer.contentPerItem),
        contentUnit: offer.contentUnit,
        totalPackageContent: new Decimal(offer.totalPackageContent),
        baseUnit: offer.baseUnit,
        minPurchasePackages: new Decimal(offer.minPurchasePackages),
        purchaseMultiplePackages: new Decimal(offer.purchaseMultiplePackages),
        supplierSkuOrName: offer.supplierSkuOrName,
      },
      price: {
        pricePerPackage: new Decimal(offer.prices[0]!.pricePerPackage),
        taxStatus: offer.prices[0]!.taxStatus,
        taxRatePercent: offer.prices[0]!.taxRateValueSnapshot
          ? new Decimal(offer.prices[0]!.taxRateValueSnapshot)
          : null,
        pricePerPackageAfterTax: ctx.subtotal.pricePerPackageAfterTax,
        pricePerBaseUnitAfterTax: ctx.pricePerBaseUnitAfterTax,
        updatedAt: offer.prices[0]!.createdAt,
        isStale: ctx.priceFreshness.isStale,
        freshnessMessage: ctx.priceFreshness.message,
      },
      stock: {
        availabilityStatus: offer.stock?.availabilityStatus ?? "PERLU_KONFIRMASI",
        stockQty: offer.stock?.stockQty ? new Decimal(offer.stock.stockQty) : null,
        updatedAt: offer.stock?.updatedAt ?? null,
        meetsNeed: ctx.stockEval.meetsNeed,
        isCertain: ctx.stockEval.isCertain,
        reason: ctx.stockEval.reason,
        isStale: ctx.stockFreshness?.isStale ?? null,
        freshnessMessage: ctx.stockFreshness?.message ?? null,
      },
      purchase: {
        packagesRequiredRaw: ctx.purchase.packagesRequiredRaw,
        packagesToBuy: ctx.purchase.packagesToBuy,
        actualQuantityInBaseUnit: ctx.purchase.actualQuantityInBaseUnit,
        excessQuantityInBaseUnit: ctx.purchase.excessQuantityInBaseUnit,
      },
      money: {
        subtotalAfterTax: ctx.subtotal.subtotalAfterTax,
        shippingMode: ctx.shippingMode,
        shippingLabel: ctx.shipping.label,
        shippingFee: ctx.shipping.fee,
        isFreeShipping: ctx.shipping.isFreeShipping,
        requiresShippingConfirmation: ctx.shipping.requiresConfirmation,
        totalCost: ctx.orderTotal.totalCost,
        finalPricePerBaseUnit: ctx.orderTotal.finalPricePerBaseUnit,
      },
      delivery: {
        leadTimeDaysMin: offer.estimatedDeliveryDaysMin ?? offer.supplier.leadTimeDaysMin,
        leadTimeDaysMax: offer.estimatedDeliveryDaysMax ?? offer.supplier.leadTimeDaysMax,
        deliveryDaysOfWeek: offer.supplier.deliverySchedules.map((s) => s.dayOfWeek),
        estimatedShipDate: ctx.delivery.estimatedShipDate,
        estimatedArrivalMin: ctx.delivery.estimatedArrivalMin,
        estimatedArrivalMax: ctx.delivery.estimatedArrivalMax,
        arrivesInTime: ctx.arrivesInTime,
      },
      servesDestination: ctx.servesDestination,
      proximity: ctx.proximity,
      reliability: {
        hasHistory: ctx.reliability.hasHistory,
        hasEnoughData: ctx.reliability.hasEnoughData,
        ratePercent: ctx.reliability.hasHistory ? ctx.reliability.ratePercent : null,
        completedCount: ctx.reliability.completedCount,
        message: ctx.reliability.message,
      },
      eligible: eligibility.eligible,
      blockingReasons: eligibility.blockingReasons,
      cautionNotes: eligibility.cautionNotes,
      needsConfirmation,
      labels,
      reasonText,
      score: scoreById.get(offer.id) ?? 0,
    };
  });

  return {
    product: {
      id: product.id,
      productName: product.productName,
      sku: product.sku,
      unitFamily: product.unitFamily,
      baseUnit: product.baseUnit,
    },
    neededQuantityInBaseUnit: neededBase.quantity,
    rows,
  };
}
