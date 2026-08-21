"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  AVAILABILITY_STATUSES,
  MEASUREMENT_UNITS,
  PACKAGING_TYPES,
  TAX_STATUSES,
  UNIT_FAMILY,
  resolvePackage,
  calculatePricePerBaseUnit,
} from "@/lib/domain";
import type { MeasurementUnit, PackagingType, UnitFamily } from "@/lib/domain/units/types";
import type { AvailabilityStatus, TaxStatus } from "@/lib/domain/pricing/types";
import {
  AVAILABILITY_STATUS_LABELS,
  MEASUREMENT_UNIT_LABELS,
  PACKAGING_TYPE_LABELS,
  TAX_STATUS_LABELS,
  BASE_UNIT_LABELS,
} from "@/lib/format/units";
import { formatRupiah } from "@/lib/format/currency";

export interface SupplierOption {
  id: string;
  supplierName: string;
}

export interface TaxRateOption {
  id: string;
  name: string;
  ratePercent: string;
}

interface OfferFieldErrors {
  supplierId?: string[];
  supplierSkuOrName?: string[];
  packageType?: string[];
  itemsPerPackage?: string[];
  contentPerItem?: string[];
  contentUnit?: string[];
  minPurchasePackages?: string[];
  purchaseMultiplePackages?: string[];
  price?: string[];
  stock?: string[];
}

function unitsForFamily(family: UnitFamily): MeasurementUnit[] {
  return MEASUREMENT_UNITS.filter((unit) => UNIT_FAMILY[unit] === family);
}

/**
 * Preview harga per satuan dasar (docs/BACKLOG.md #5) - dihitung memakai
 * fungsi murni yang SAMA dengan mesin Tahap 2 (`resolvePackage` +
 * `calculatePricePerBaseUnit`), murni untuk ditampilkan ke pengguna secara
 * langsung saat mengisi form, TIDAK dikirim ke server (server selalu
 * menghitung ulang sendiri dari field mentah).
 */
function computePreview(input: {
  packageType: PackagingType;
  itemsPerPackage: string;
  contentPerItem: string;
  contentUnit: MeasurementUnit;
  pricePerPackage: string;
}) {
  const items = Number(input.itemsPerPackage);
  const content = Number(input.contentPerItem);
  const price = Number(input.pricePerPackage);
  if (!Number.isFinite(items) || items <= 0) return null;
  if (!Number.isFinite(content) || content <= 0) return null;
  if (!Number.isFinite(price) || price <= 0) return null;

  try {
    const resolved = resolvePackage({
      packagingType: input.packageType,
      itemsPerPackage: items,
      contentPerItem: content,
      contentUnit: input.contentUnit,
    });
    const perBaseUnit = calculatePricePerBaseUnit(price, resolved.totalContentInBaseUnit);
    return {
      totalContent: resolved.totalContentInBaseUnit.toNumber(),
      baseUnit: resolved.baseUnit,
      perBaseUnit: perBaseUnit.toNumber(),
    };
  } catch {
    return null;
  }
}

/**
 * Form tambah penawaran (Tahap 3, langkah 6 — lihat
 * `docs/TAHAP_3_UI_CHECKLIST.md`; disederhanakan 2026-08-21, lihat
 * docs/BACKLOG.md #5). `productId` sudah tetap (dari halaman detail
 * produk), pengguna hanya memilih supplier + isian kemasan, harga, pajak,
 * dan stok. `totalPackageContent`/`baseUnit` TIDAK dikirim - selalu
 * dihitung ulang di server oleh `resolvePackage()` (mesin Tahap 2).
 *
 * Mode default menyembunyikan "Jumlah Barang per Kemasan" (dianggap 1) -
 * cukup untuk mayoritas kasus (mis. "1 kg aci seharga Rp14.000"). Toggle
 * "Kemasan berlapis" baru dipakai untuk kasus dus/pak isi banyak barang
 * kecil (mis. 1 dus = 12 botol).
 */
export function OfferForm({
  productId,
  unitFamily,
  suppliers,
  taxRates,
}: {
  productId: string;
  unitFamily: UnitFamily;
  suppliers: SupplierOption[];
  taxRates: TaxRateOption[];
}) {
  const router = useRouter();
  const allowedUnits = unitsForFamily(unitFamily);

  const [supplierId, setSupplierId] = useState("");
  const [supplierSkuOrName, setSupplierSkuOrName] = useState("");
  const [packageType, setPackageType] = useState<PackagingType>(PACKAGING_TYPES[0]);
  const [isLayered, setIsLayered] = useState(false);
  const [itemsPerPackage, setItemsPerPackage] = useState("1");
  const [contentPerItem, setContentPerItem] = useState("1");
  const [contentUnit, setContentUnit] = useState<MeasurementUnit>(
    allowedUnits[0] ?? MEASUREMENT_UNITS[0],
  );
  const [minPurchasePackages, setMinPurchasePackages] = useState("1");
  const [purchaseMultiplePackages, setPurchaseMultiplePackages] = useState("1");
  const [pricePerPackage, setPricePerPackage] = useState("");
  const [taxStatus, setTaxStatus] = useState<TaxStatus>("NONE");
  const [taxRateId, setTaxRateId] = useState(taxRates[0]?.id ?? "");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("TERSEDIA");
  const [stockQty, setStockQty] = useState("");
  const [fieldErrors, setFieldErrors] = useState<OfferFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Produk "hitungan" (pcs, renceng, dus isi sekian pcs, dst) TIDAK butuh
  // "Isi per Kemasan + Satuan" sama sekali - beda dari produk berat/volume.
  // Satu "barang" pada produk hitungan SELALU = 1 pcs (isi=1, satuan=PCS,
  // tetap/tidak bisa berubah), jadi satu-satunya yang perlu diisi adalah
  // "berapa pcs dalam 1 kemasan" - inilah yang sering beda-beda per
  // supplier (mis. 1 renceng ada yang isi 10, ada yang isi 12), makanya
  // field ini TIDAK BOLEH dikunci ke satuan baku seperti "lusin" (yang
  // artinya selalu 12) - lihat docs/BACKLOG.md #5.
  const isCountFamily = unitFamily === "COUNT";

  // Kalau mode sederhana (bukan kemasan berlapis) untuk produk berat/
  // volume, jumlah barang selalu 1 - field-nya disembunyikan supaya tidak
  // membingungkan (docs/BACKLOG.md #5).
  const effectiveItemsPerPackage = isCountFamily
    ? itemsPerPackage
    : isLayered
      ? itemsPerPackage
      : "1";
  const effectiveContentPerItem = isCountFamily ? "1" : contentPerItem;
  const effectiveContentUnit: MeasurementUnit = isCountFamily ? "PCS" : contentUnit;

  const preview = useMemo(
    () =>
      computePreview({
        packageType,
        itemsPerPackage: effectiveItemsPerPackage,
        contentPerItem: effectiveContentPerItem,
        contentUnit: effectiveContentUnit,
        pricePerPackage,
      }),
    [
      packageType,
      effectiveItemsPerPackage,
      effectiveContentPerItem,
      effectiveContentUnit,
      pricePerPackage,
    ],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch("/api/supplier-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        productId,
        supplierSkuOrName: supplierSkuOrName || undefined,
        packageType,
        itemsPerPackage: Number(effectiveItemsPerPackage),
        contentPerItem: Number(effectiveContentPerItem),
        contentUnit: effectiveContentUnit,
        minPurchasePackages: Number(minPurchasePackages),
        purchaseMultiplePackages: Number(purchaseMultiplePackages),
        price: {
          pricePerPackage: Number(pricePerPackage),
          taxStatus,
          taxRateId: taxStatus === "NONE" ? undefined : taxRateId || undefined,
        },
        stock: {
          availabilityStatus,
          stockQty: stockQty === "" ? undefined : Number(stockQty),
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: OfferFieldErrors;
    } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(payload?.error ?? "Gagal menyimpan penawaran. Periksa kembali data yang diisi.");
      setFieldErrors(payload?.issues ?? {});
      return;
    }

    setSuccessMessage("Penawaran baru tersimpan.");
    setPricePerPackage("");
    setStockQty("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="offer-supplier">Supplier</Label>
        <Select
          id="offer-supplier"
          required
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
        >
          <option value="">Pilih supplier...</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.supplierName}
            </option>
          ))}
        </Select>
        {fieldErrors.supplierId ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.supplierId[0]}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="offer-package-type">Jenis Kemasan</Label>
        <Select
          id="offer-package-type"
          required
          value={packageType}
          onChange={(event) => setPackageType(event.target.value as PackagingType)}
        >
          {PACKAGING_TYPES.map((type) => (
            <option key={type} value={type}>
              {PACKAGING_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
        {fieldErrors.packageType ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.packageType[0]}</p>
        ) : null}
      </div>

      {isCountFamily ? (
        <div>
          <Label htmlFor="offer-items-per-package">
            Berapa Pcs dalam 1 {PACKAGING_TYPE_LABELS[packageType]}?
          </Label>
          <Input
            id="offer-items-per-package"
            type="number"
            min="0"
            step="any"
            required
            value={itemsPerPackage}
            onChange={(event) => setItemsPerPackage(event.target.value)}
            placeholder="Contoh: 10 atau 12"
          />
          <p className="mt-1 text-xs text-slate-500">
            Isinya bisa beda-beda tiap supplier (ada renceng isi 10, ada yang isi 12) - isi sesuai
            kemasan supplier ini, jangan ditebak.
          </p>
          {fieldErrors.itemsPerPackage ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.itemsPerPackage[0]}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offer-content-per-item">
                {isLayered ? "Isi per 1 Barang di Dalamnya" : "Isi per Kemasan"}
              </Label>
              <Input
                id="offer-content-per-item"
                type="number"
                min="0"
                step="any"
                required
                value={contentPerItem}
                onChange={(event) => setContentPerItem(event.target.value)}
              />
              {fieldErrors.contentPerItem ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.contentPerItem[0]}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="offer-content-unit">Satuan</Label>
              <Select
                id="offer-content-unit"
                required
                value={contentUnit}
                onChange={(event) => setContentUnit(event.target.value as MeasurementUnit)}
              >
                {allowedUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {MEASUREMENT_UNIT_LABELS[unit]}
                  </option>
                ))}
              </Select>
              {fieldErrors.contentUnit ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.contentUnit[0]}</p>
              ) : null}
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Contoh: beli aci 1 kg → isi <strong>1</strong>, satuan <strong>kg</strong>.
          </p>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={isLayered}
              onChange={(event) => setIsLayered(event.target.checked)}
            />
            <span>
              Kemasan ini berisi beberapa barang kecil (misal 1 dus isi 12 botol, atau 1 pak isi 24
              pcs)
            </span>
          </label>

          {isLayered ? (
            <div>
              <Label htmlFor="offer-items-per-package">Jumlah Barang Kecil per Kemasan</Label>
              <Input
                id="offer-items-per-package"
                type="number"
                min="0"
                step="any"
                required
                value={itemsPerPackage}
                onChange={(event) => setItemsPerPackage(event.target.value)}
                placeholder="Contoh: 12 (kalau 1 dus isi 12 botol)"
              />
              {fieldErrors.itemsPerPackage ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.itemsPerPackage[0]}</p>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <div>
        <Label htmlFor="offer-price">Harga per Kemasan (Rp)</Label>
        <Input
          id="offer-price"
          type="number"
          min="0"
          step="any"
          required
          value={pricePerPackage}
          onChange={(event) => setPricePerPackage(event.target.value)}
        />
      </div>

      {preview ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <p>
            1 {PACKAGING_TYPE_LABELS[packageType].toLowerCase()} ={" "}
            <strong>
              {preview.totalContent} {BASE_UNIT_LABELS[preview.baseUnit]}
            </strong>
          </p>
          <p className="mt-1">
            Harga ≈{" "}
            <strong>
              {formatRupiah(preview.perBaseUnit)} / {BASE_UNIT_LABELS[preview.baseUnit]}
            </strong>{" "}
            — pakai ini untuk mengecek apakah harganya masuk akal.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="offer-availability">Status Stok</Label>
          <Select
            id="offer-availability"
            required
            value={availabilityStatus}
            onChange={(event) => setAvailabilityStatus(event.target.value as AvailabilityStatus)}
          >
            {AVAILABILITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {AVAILABILITY_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="offer-stock-qty">Jumlah Stok</Label>
          <Input
            id="offer-stock-qty"
            type="number"
            min="0"
            step="any"
            placeholder="Opsional"
            value={stockQty}
            onChange={(event) => setStockQty(event.target.value)}
          />
        </div>
      </div>
      {fieldErrors.stock ? <p className="text-xs text-red-600">{fieldErrors.stock[0]}</p> : null}

      <details className="rounded-lg border border-slate-200 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">
          Pengaturan Lanjutan (opsional)
        </summary>
        <div className="mt-3 space-y-4">
          <div>
            <Label htmlFor="offer-sku">SKU/Nama di Supplier</Label>
            <Input
              id="offer-sku"
              placeholder="Opsional"
              value={supplierSkuOrName}
              onChange={(event) => setSupplierSkuOrName(event.target.value)}
            />
            {fieldErrors.supplierSkuOrName ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.supplierSkuOrName[0]}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offer-min-purchase">Minimum Pembelian (kemasan)</Label>
              <Input
                id="offer-min-purchase"
                type="number"
                min="0"
                step="any"
                required
                value={minPurchasePackages}
                onChange={(event) => setMinPurchasePackages(event.target.value)}
              />
              {fieldErrors.minPurchasePackages ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.minPurchasePackages[0]}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="offer-multiple-purchase">Kelipatan Pembelian (kemasan)</Label>
              <Input
                id="offer-multiple-purchase"
                type="number"
                min="1"
                step="1"
                required
                value={purchaseMultiplePackages}
                onChange={(event) => setPurchaseMultiplePackages(event.target.value)}
              />
              {fieldErrors.purchaseMultiplePackages ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.purchaseMultiplePackages[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offer-tax-status">Status Pajak</Label>
              <Select
                id="offer-tax-status"
                required
                value={taxStatus}
                onChange={(event) => setTaxStatus(event.target.value as TaxStatus)}
              >
                {TAX_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {TAX_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="offer-tax-rate">Tarif Pajak</Label>
              <Select
                id="offer-tax-rate"
                disabled={taxStatus === "NONE" || taxRates.length === 0}
                value={taxRateId}
                onChange={(event) => setTaxRateId(event.target.value)}
              >
                {taxStatus === "NONE" ? (
                  <option value="">Tidak berlaku</option>
                ) : taxRates.length === 0 ? (
                  <option value="">Belum ada tarif pajak</option>
                ) : (
                  taxRates.map((rate) => (
                    <option key={rate.id} value={rate.id}>
                      {rate.name} ({rate.ratePercent}%)
                    </option>
                  ))
                )}
              </Select>
            </div>
          </div>
          {fieldErrors.price ? (
            <p className="text-xs text-red-600">{fieldErrors.price[0]}</p>
          ) : null}
        </div>
      </details>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm font-medium text-emerald-600">{successMessage}</p>
      ) : null}

      <Button type="submit" disabled={isSubmitting || suppliers.length === 0}>
        {isSubmitting ? "Menyimpan..." : "Simpan Penawaran"}
      </Button>
      {suppliers.length === 0 ? (
        <p className="text-xs text-slate-500">Belum ada supplier aktif untuk dipilih.</p>
      ) : null}
    </form>
  );
}
