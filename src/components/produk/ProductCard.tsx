import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { NavIcon } from "@/components/app-shell/NavIcon";
import { categoryTone } from "@/lib/format/category-color";
import type { UnitFamily } from "@/lib/domain/units/types";

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
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-50">
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto dari tautan bebas/Supabase Storage
          <img
            src={product.photoUrl}
            alt={product.productName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
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
          className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:text-indigo-600"
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
        <p className="text-xs text-slate-400">SKU: {product.sku}</p>

        <div className="mt-auto flex items-center justify-between pt-2 text-xs">
          <span className="font-medium text-indigo-600">
            {product.offerCount === 0
              ? "Belum ada supplier"
              : `${product.offerCount} penawaran supplier`}
          </span>
        </div>
      </div>
    </div>
  );
}
