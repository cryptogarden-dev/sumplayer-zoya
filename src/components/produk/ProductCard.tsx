import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { NavIcon } from "@/components/app-shell/NavIcon";
import { categoryTone } from "@/lib/format/category-color";
import { formatRupiah } from "@/lib/format/currency";
import { BASE_UNIT_LABELS } from "@/lib/format/units";
import type { BaseUnit, UnitFamily } from "@/lib/domain/units/types";

// Kelas Tailwind harus berupa literal statis agar terdeteksi compiler -
// tidak bisa disusun lewat template string seperti `bg-${tone}-100`.
const PLACEHOLDER_TONE_CLASSES: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-500",
  indigo: "bg-indigo-100 text-indigo-500",
  emerald: "bg-emerald-100 text-emerald-500",
  amber: "bg-amber-100 text-amber-500",
  red: "bg-red-100 text-red-500",
  sky: "bg-sky-100 text-sky-500",
  violet: "bg-violet-100 text-violet-500",
  rose: "bg-rose-100 text-rose-500",
  // Wajib ada karena Record<BadgeTone, string> (tone "success" ditambah ke
  // Badge di upgrade UI Zoya); categoryTone tidak pernah mengembalikan
  // "success", jadi entri ini hanya pelengkap tipe.
  success: "bg-success-bg text-success",
};

export interface ProductCardData {
  id: string;
  sku: string;
  productName: string;
  brand: string | null;
  variant: string | null;
  unitFamily: UnitFamily;
  photoUrl: string | null;
  isActive: boolean;
  offerCount: number;
  supplierIds: string[];
  category: { id: string; name: string } | null;
  /** Stok toko saat ini, dalam satuan dasar produk (R18). */
  stockQty: string;
  /** Ambang peringatan stok menipis, null bila tidak diatur. */
  lowStockThreshold: string | null;
  baseUnit: BaseUnit;
  /** Harga jual per satuan dasar (string Decimal), null bila belum diatur. */
  sellPricePerBaseUnit: string | null;
  /** Harga beli termurah per satuan dasar (setelah pajak), null bila belum
   * ada penawaran. */
  cheapestBuyPerBaseUnit: number | null;
  /** Persen margin vs harga beli termurah, null bila tidak bisa dihitung. */
  marginPercent: number | null;
}

/**
 * Kartu produk bergaya marketplace (permintaan pengguna 2026-08-20): klik
 * kartu membuka panel "Pesan" (`ProductQuickOrderSheet`) - BUKAN langsung
 * ke halaman edit/nonaktifkan, supaya tidak ada risiko salah klik ke aksi
 * admin. Ikon pensil kecil di pojok tetap tersedia untuk akses cepat ke
 * halaman edit bagi yang memang mau mengubah data produk.
 */
export function ProductCard({
  product,
  onSelect,
}: {
  product: ProductCardData;
  onSelect: (productId: string) => void;
}) {
  const tone = product.category ? categoryTone(product.category.id) : "slate";
  const subtitle = [product.brand, product.variant].filter(Boolean).join(" · ");
  const stockQty = Number(product.stockQty);
  const isLowStock =
    product.lowStockThreshold !== null && stockQty <= Number(product.lowStockThreshold);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(product.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(product.id);
        }
      }}
      className="border-divider hover:border-cloud focus-visible:outline-slate flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] border bg-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="bg-page relative m-2.5 mb-0 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[14px]">
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto dari tautan bebas/Supabase Storage
          <img
            src={product.photoUrl}
            alt={product.productName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full ${PLACEHOLDER_TONE_CLASSES[tone]}`}
          >
            <NavIcon
              name={product.unitFamily === "WEIGHT" ? "scale" : "package"}
              className="h-7 w-7"
            />
          </span>
        )}
        {!product.isActive ? (
          <span className="absolute top-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[11px] font-medium text-white">
            Nonaktif
          </span>
        ) : null}
        <Link
          href={`/produk/${product.id}`}
          onClick={(event) => event.stopPropagation()}
          className="hover:text-slate absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm"
          aria-label="Edit produk"
          title="Edit produk"
        >
          ✏️
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {product.category ? (
          <Badge tone={tone} className="self-start">
            {product.category.name}
          </Badge>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.productName}</h3>
        {subtitle ? <p className="line-clamp-1 text-xs text-slate-500">{subtitle}</p> : null}
        {/* Modal dan Jual berdampingan, keduanya per satuan dasar dengan
            label satuannya (kg/pcs/liter) supaya 1 kg, 1/2 kg, dan 1/4 kg
            langsung kebaca — bukan harga per kemasan tanpa satuan. */}
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Modal</p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {product.cheapestBuyPerBaseUnit != null
                ? `${formatRupiah(product.cheapestBuyPerBaseUnit)}/${BASE_UNIT_LABELS[product.baseUnit]}`
                : "—"}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Jual</p>
            {product.sellPricePerBaseUnit != null ? (
              <p className="text-kunyit truncate text-sm font-semibold">
                {formatRupiah(Number(product.sellPricePerBaseUnit))}/
                {BASE_UNIT_LABELS[product.baseUnit]}
              </p>
            ) : (
              <p className="truncate text-sm text-slate-400">
                — <span className="text-xs">belum diatur</span>
              </p>
            )}
          </div>
        </div>
        {product.marginPercent != null ? (
          <p
            className={`text-xs font-medium ${
              product.marginPercent < 0 ? "text-red-600" : "text-emerald-600"
            }`}
          >
            Margin{" "}
            {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(
              product.marginPercent,
            )}
            %
          </p>
        ) : null}
        <p className="text-xs text-slate-500">
          Stok toko: {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(stockQty)}{" "}
          {BASE_UNIT_LABELS[product.baseUnit]}
          {isLowStock ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
              Stok menipis
            </span>
          ) : null}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2 text-xs">
          <span className="text-slate font-medium">
            {product.offerCount === 0
              ? "Belum ada supplier"
              : `${product.offerCount} penawaran supplier`}
          </span>
        </div>
      </div>
    </div>
  );
}
