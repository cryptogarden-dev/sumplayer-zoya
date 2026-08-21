"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ComparisonForm,
  type BusinessLocationOption,
  type ComparisonFormValues,
} from "@/components/perbandingan/ComparisonForm";
import { ComparisonFilters } from "@/components/perbandingan/ComparisonFilters";
import { ComparisonCards } from "@/components/perbandingan/ComparisonCards";
import { ComparisonTable } from "@/components/perbandingan/ComparisonTable";
import { formatRupiah } from "@/lib/format/currency";
import type {
  ComparisonApiResponse,
  ComparisonFiltersState,
  ComparisonRowDto,
  ProductOption,
  SortKey,
} from "@/components/perbandingan/types";

const DEFAULT_FILTERS: ComparisonFiltersState = {
  onlyAvailable: false,
  onlyFreeShipping: false,
  onlyServesDestination: false,
  onlyArrivesInTime: false,
};

function toDecimal(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function compareNullableAsc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function sortRows(rows: ComparisonRowDto[], sortKey: SortKey): ComparisonRowDto[] {
  const copy = [...rows];
  copy.sort((rowA, rowB) => {
    switch (sortKey) {
      case "unitPrice":
        return compareNullableAsc(
          toDecimal(rowA.money.finalPricePerBaseUnit),
          toDecimal(rowB.money.finalPricePerBaseUnit),
        );
      case "totalCost":
        return compareNullableAsc(toDecimal(rowA.money.totalCost), toDecimal(rowB.money.totalCost));
      case "arrival":
        return (
          new Date(rowA.delivery.estimatedArrivalMax).getTime() -
          new Date(rowB.delivery.estimatedArrivalMax).getTime()
        );
      case "distance":
        return compareNullableAsc(rowA.proximity.score, rowB.proximity.score);
      case "reliability": {
        // Yang punya cukup data riwayat diutamakan, lalu persentase tertinggi.
        const rank = (row: ComparisonRowDto) =>
          row.reliability.hasEnoughData ? 0 : row.reliability.hasHistory ? 1 : 2;
        const rankDiff = rank(rowA) - rank(rowB);
        if (rankDiff !== 0) return rankDiff;
        return (rowB.reliability.ratePercent ?? 0) - (rowA.reliability.ratePercent ?? 0);
      }
      default:
        return 0;
    }
  });
  return copy;
}

function applyFilters(
  rows: ComparisonRowDto[],
  filters: ComparisonFiltersState,
): ComparisonRowDto[] {
  return rows.filter((row) => {
    if (filters.onlyAvailable && !(row.stock.meetsNeed && row.stock.isCertain)) return false;
    if (filters.onlyFreeShipping && !row.money.isFreeShipping) return false;
    if (filters.onlyServesDestination && row.servesDestination !== true) return false;
    if (filters.onlyArrivesInTime && !row.delivery.arrivesInTime) return false;
    return true;
  });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ComparisonView() {
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [locations, setLocations] = useState<BusinessLocationOption[]>([]);

  const [values, setValues] = useState<ComparisonFormValues>({
    productId: "",
    neededQuantity: "",
    neededUnit: "",
    province: "",
    city: "",
    district: "",
    neededByDate: todayIsoDate(),
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonApiResponse | null>(null);

  const [filters, setFilters] = useState<ComparisonFiltersState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("unitPrice");
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("Gagal memuat daftar produk.");
        return response.json() as Promise<{ products: ProductOption[] }>;
      })
      .then((data) => {
        if (!cancelled) setProducts(data.products);
      })
      .catch(() => {
        if (!cancelled)
          setProductsError("Gagal memuat daftar produk. Muat ulang halaman untuk mencoba lagi.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Muat cabang/lokasi tersimpan (docs/BACKLOG.md #1) untuk dipilih langsung
  // di form (lihat ComparisonForm) - dan isi otomatis tujuan dari cabang
  // default agar pengguna tidak perlu memilih manual setiap kali.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/business-locations")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ locations: BusinessLocationOption[] }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setLocations(data.locations);
        const defaultLocation = data.locations.find((location) => location.isDefault);
        if (!defaultLocation) return;
        setValues((current) =>
          current.province || current.city || current.district
            ? current
            : {
                ...current,
                province: defaultLocation.province,
                city: defaultLocation.city ?? "",
                district: defaultLocation.district ?? "",
              },
        );
      })
      .catch(() => {
        // Diamkan - lokasi tersimpan hanya kemudahan pengisian, form tetap bisa diisi manual.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    setStatus("loading");
    setErrorMessage(null);
    setSelectedOfferId(null);

    const params = new URLSearchParams({
      productId: values.productId,
      neededQuantity: values.neededQuantity,
      neededUnit: values.neededUnit,
      province: values.province,
      neededByDate: values.neededByDate,
    });
    if (values.city.trim()) params.set("city", values.city.trim());
    if (values.district.trim()) params.set("district", values.district.trim());

    try {
      const response = await fetch(`/api/comparison?${params.toString()}`);
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = (data as { error?: string }).error ?? "Gagal membandingkan harga.";
        setErrorMessage(message);
        setStatus("error");
        return;
      }
      setResult(data as ComparisonApiResponse);
      setStatus("success");
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.");
      setStatus("error");
    }
  }

  const visibleRows = useMemo(() => {
    if (!result) return [];
    return sortRows(applyFilters(result.rows, filters), sortKey);
  }, [result, filters, sortKey]);

  const selectedRow = visibleRows.find((row) => row.offerId === selectedOfferId) ?? null;
  const neededByDate = result ? new Date(values.neededByDate) : new Date();

  return (
    <div className="space-y-6">
      <Card>
        {productsError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {productsError}
          </p>
        ) : products === null ? (
          <p className="text-sm text-slate-500">Memuat daftar produk...</p>
        ) : products.length === 0 ? (
          <EmptyState
            title="Belum ada produk"
            description="Tambahkan produk terlebih dahulu pada menu Produk sebelum membandingkan harga supplier."
          />
        ) : (
          <ComparisonForm
            products={products}
            locations={locations}
            values={values}
            onChange={setValues}
            onSubmit={handleSubmit}
            isLoading={status === "loading"}
          />
        )}
      </Card>

      {status === "loading" ? (
        <Card>
          <p className="text-sm text-slate-500">Sedang menghitung perbandingan...</p>
        </Card>
      ) : null}

      {status === "error" ? (
        <Card>
          <p className="text-sm font-medium text-red-600" role="alert">
            {errorMessage}
          </p>
        </Card>
      ) : null}

      {status === "success" && result ? (
        result.rows.length === 0 ? (
          <EmptyState
            title="Belum ada penawaran untuk produk ini"
            description="Belum ada supplier yang menawarkan produk ini. Tambahkan penawaran dari menu Produk terlebih dahulu."
          />
        ) : (
          <>
            <Card>
              <ComparisonFilters value={filters} onChange={setFilters} />
            </Card>

            {selectedRow ? (
              <Card className="border-indigo-300 bg-indigo-50">
                <p className="text-sm font-semibold text-indigo-900">
                  Dipilih: {selectedRow.supplier.name} — Total{" "}
                  {selectedRow.money.totalCost === null
                    ? "menunggu konfirmasi ongkir"
                    : formatRupiah(selectedRow.money.totalCost)}
                </p>
                <p className="mt-1 text-sm text-indigo-800">
                  Hubungi supplier melalui tombol WhatsApp pada baris/kartu supplier tersebut untuk
                  melanjutkan pemesanan.
                </p>
              </Card>
            ) : null}

            {visibleRows.length === 0 ? (
              <EmptyState
                title="Tidak ada supplier yang sesuai filter"
                description="Longgarkan filter di atas untuk melihat lebih banyak pilihan supplier."
              />
            ) : (
              <>
                <ComparisonCards
                  rows={visibleRows}
                  productName={result.product.productName}
                  neededByDate={neededByDate}
                  selectedOfferId={selectedOfferId}
                  onSelect={setSelectedOfferId}
                />
                <ComparisonTable
                  rows={visibleRows}
                  productName={result.product.productName}
                  neededByDate={neededByDate}
                  selectedOfferId={selectedOfferId}
                  onSelect={setSelectedOfferId}
                  sortKey={sortKey}
                  onSortKeyChange={setSortKey}
                />
              </>
            )}
          </>
        )
      ) : null}
    </div>
  );
}
