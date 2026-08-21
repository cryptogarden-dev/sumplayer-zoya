"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { UNIT_FAMILY } from "@/lib/domain/units/constants";
import { MEASUREMENT_UNITS, type MeasurementUnit, type UnitFamily } from "@/lib/domain/units/types";
import { MEASUREMENT_UNIT_LABELS } from "@/lib/format/units";
import type { ProductOption } from "@/components/perbandingan/types";

export interface ComparisonFormValues {
  productId: string;
  neededQuantity: string;
  neededUnit: MeasurementUnit | "";
  province: string;
  city: string;
  district: string;
  neededByDate: string;
}

export interface BusinessLocationOption {
  id: string;
  name: string;
  province: string;
  city: string | null;
  district: string | null;
  isDefault: boolean;
}

interface ComparisonFormProps {
  products: ProductOption[];
  locations: BusinessLocationOption[];
  values: ComparisonFormValues;
  onChange: (values: ComparisonFormValues) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const MANUAL_ADDRESS_VALUE = "__manual__";

function unitsForFamily(family: UnitFamily | null): MeasurementUnit[] {
  if (!family) return [];
  return MEASUREMENT_UNITS.filter((unit) => UNIT_FAMILY[unit] === family);
}

/**
 * Form Bandingkan (Tahap 4, dirapikan 2026-08-20). Tujuan pengiriman
 * sekarang memilih dari cabang/lokasi tersimpan (`BusinessLocation`,
 * docs/BACKLOG.md #1) alih-alih mengetik provinsi/kota/kecamatan manual
 * setiap kali - jauh lebih ringkas untuk pengguna yang alamatnya sudah
 * tetap. Alamat manual tetap tersedia sebagai opsi lanjutan untuk kasus
 * tujuan yang berbeda dari cabang biasa.
 */
export function ComparisonForm({
  products,
  locations,
  values,
  onChange,
  onSubmit,
  isLoading,
}: ComparisonFormProps) {
  const selectedProduct = products.find((p) => p.id === values.productId) ?? null;
  const allowedUnits = unitsForFamily(selectedProduct?.unitFamily ?? null);

  const matchedLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          location.province === values.province &&
          (location.city ?? "") === values.city &&
          (location.district ?? "") === values.district,
      ) ?? null,
    [locations, values.province, values.city, values.district],
  );

  const [manualMode, setManualMode] = useState(locations.length === 0);

  function set<K extends keyof ComparisonFormValues>(key: K, value: ComparisonFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function applyLocation(locationId: string) {
    if (locationId === MANUAL_ADDRESS_VALUE) {
      setManualMode(true);
      return;
    }
    const location = locations.find((item) => item.id === locationId);
    if (!location) return;
    onChange({
      ...values,
      province: location.province,
      city: location.city ?? "",
      district: location.district ?? "",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const isValid =
    values.productId !== "" &&
    values.neededQuantity !== "" &&
    Number(values.neededQuantity) > 0 &&
    values.neededUnit !== "" &&
    values.province.trim() !== "" &&
    values.neededByDate !== "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Kebutuhan</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <Label htmlFor="cmp-product">Produk</Label>
            <Select
              id="cmp-product"
              required
              value={values.productId}
              onChange={(event) => {
                const productId = event.target.value;
                const product = products.find((p) => p.id === productId);
                const units = unitsForFamily(product?.unitFamily ?? null);
                onChange({
                  ...values,
                  productId,
                  neededUnit: units[0] ?? "",
                });
              }}
            >
              <option value="">Pilih produk...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.productName} ({product.sku})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="cmp-quantity">Jumlah Kebutuhan</Label>
            <Input
              id="cmp-quantity"
              type="number"
              min="0"
              step="any"
              required
              value={values.neededQuantity}
              onChange={(event) => set("neededQuantity", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cmp-unit">Satuan Kebutuhan</Label>
            <Select
              id="cmp-unit"
              required
              disabled={allowedUnits.length === 0}
              value={values.neededUnit}
              onChange={(event) => set("neededUnit", event.target.value as MeasurementUnit)}
            >
              {allowedUnits.length === 0 ? <option value="">Pilih produk dahulu</option> : null}
              {allowedUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {MEASUREMENT_UNIT_LABELS[unit]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Tujuan &amp; Waktu</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!manualMode && locations.length > 0 ? (
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="cmp-location">Kirim ke Cabang</Label>
              <Select
                id="cmp-location"
                value={matchedLocation?.id ?? ""}
                onChange={(event) => applyLocation(event.target.value)}
              >
                {!matchedLocation ? <option value="">Pilih cabang...</option> : null}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                    {location.isDefault ? " (Default)" : ""}
                  </option>
                ))}
                <option value={MANUAL_ADDRESS_VALUE}>Alamat lain (isi manual)...</option>
              </Select>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="cmp-province">Provinsi Tujuan</Label>
                <Input
                  id="cmp-province"
                  required
                  placeholder="mis. DKI Jakarta"
                  value={values.province}
                  onChange={(event) => set("province", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cmp-city">Kota/Kabupaten Tujuan</Label>
                <Input
                  id="cmp-city"
                  placeholder="mis. Jakarta Timur (opsional)"
                  value={values.city}
                  onChange={(event) => set("city", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cmp-district">Kecamatan Tujuan</Label>
                <Input
                  id="cmp-district"
                  placeholder="Opsional"
                  value={values.district}
                  onChange={(event) => set("district", event.target.value)}
                />
              </div>
              {locations.length > 0 ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <button
                    type="button"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    onClick={() => setManualMode(false)}
                  >
                    Gunakan cabang tersimpan
                  </button>
                </div>
              ) : (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-slate-400">
                    Simpan cabang/lokasi bisnis Anda di menu Pengaturan &gt; Lokasi/Cabang agar
                    tidak perlu mengetik alamat ini berulang kali.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <Label htmlFor="cmp-date">Tanggal Barang Dibutuhkan</Label>
            <Input
              id="cmp-date"
              type="date"
              required
              value={values.neededByDate}
              onChange={(event) => set("neededByDate", event.target.value)}
            />
          </div>

          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
              {isLoading ? "Membandingkan..." : "Bandingkan"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
