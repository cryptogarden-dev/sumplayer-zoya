import { buildWhatsAppLink, formatWhatsAppOrderMessage } from "@/lib/domain/whatsapp/format-order";
import { BASE_UNIT_LABELS, PACKAGING_TYPE_LABELS } from "@/lib/format/units";
import type { BaseUnit, PackagingType } from "@/lib/domain/units/types";
import type { ComparisonRowDto } from "@/components/perbandingan/types";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function formatQty(value: string): string {
  return numberFormatter.format(Number(value));
}

export function packagingLabel(type: string): string {
  return PACKAGING_TYPE_LABELS[type as PackagingType] ?? type;
}

export function baseUnitLabel(unit: string): string {
  return BASE_UNIT_LABELS[unit as BaseUnit] ?? unit;
}

/** Mengembalikan `null` jika supplier tidak punya nomor HP/WA yang dapat dihubungi. */
export function buildRowWhatsAppUrl(
  row: ComparisonRowDto,
  productName: string,
  neededByDate: Date,
): string | null {
  const phone = row.supplier.whatsappNumber ?? row.supplier.phoneNumber;
  if (!phone) return null;

  const message = formatWhatsAppOrderMessage({
    supplierName: row.supplier.name,
    productName,
    packageTypeLabel: packagingLabel(row.packaging.packageType),
    supplierSkuOrName: row.packaging.supplierSkuOrName,
    packagesToBuy: row.purchase.packagesToBuy,
    actualQuantity: row.purchase.actualQuantityInBaseUnit,
    baseUnitLabel: baseUnitLabel(row.packaging.baseUnit),
    totalCost: row.money.totalCost,
    neededByDate,
  });

  try {
    return buildWhatsAppLink(phone, message);
  } catch {
    return null;
  }
}
