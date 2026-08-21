"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/app-shell/NavIcon";
import { formatRupiah } from "@/lib/format/currency";
import { PACKAGING_TYPE_LABELS } from "@/lib/format/units";
import { categoryTone } from "@/lib/format/category-color";
import type { ProductCardData } from "@/components/produk/ProductCard";
import type { PackagingType } from "@/lib/domain/units/types";

interface OfferApiRow {
  id: string;
  isActive: boolean;
  packageType: PackagingType;
  supplier: { id: string; supplierName: string; isActive: boolean };
  prices: { pricePerPackage: string }[];
}

interface OfferRow {
  id: string;
  supplierId: string;
  supplierName: string;
  packageTypeLabel: string;
  pricePerPackage: string;
}

/**
 * Panel "Pesan" bergaya marketplace (permintaan pengguna 2026-08-20):
 * dibuka saat kartu produk diklik, alih-alih langsung ke halaman edit.
 * Menampilkan supplier mana saja yang menjual produk ini beserta harganya
 * (satu produk bisa ditawarkan beberapa supplier dengan harga berbeda -
 * beda dari fitur Bandingkan yang membandingkan area/ongkir/stok, di sini
 * fokusnya cuma "saya sudah tahu mau pesan dari supplier ini").
 *
 * Wrapper tipis ini hanya mengurus buka/tutup panel. Isi/data-fetching ada
 * di `ProductQuickOrderBody`, di-*mount ulang* per produk lewat `key`
 * (bukan direset manual di effect) agar state selalu bersih tanpa
 * `setState` sinkron di badan effect.
 */
export function ProductQuickOrderSheet({
  product,
  onClose,
}: {
  product: ProductCardData | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={product !== null} onOpenChange={(open) => !open && onClose()}>
      {product ? (
        <ProductQuickOrderBody key={product.id} product={product} onClose={onClose} />
      ) : null}
    </BottomSheet>
  );
}

function ProductQuickOrderBody({
  product,
  onClose,
}: {
  product: ProductCardData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [addedOfferIds, setAddedOfferIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/supplier-products?productId=${product.id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Gagal memuat daftar supplier.");
        return response.json() as Promise<{ offers: OfferApiRow[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setOffers(
          data.offers
            .filter((offer) => offer.isActive && offer.supplier.isActive)
            .map((offer) => ({
              id: offer.id,
              supplierId: offer.supplier.id,
              supplierName: offer.supplier.supplierName,
              packageTypeLabel: PACKAGING_TYPE_LABELS[offer.packageType],
              pricePerPackage: offer.prices[0]?.pricePerPackage ?? "0",
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError("Gagal memuat daftar supplier untuk produk ini.");
      });

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  function qtyFor(offerId: string): number {
    return quantities[offerId] ?? 1;
  }

  function setQty(offerId: string, qty: number) {
    setQuantities((current) => ({ ...current, [offerId]: Math.max(1, qty) }));
  }

  async function handleQuickOrder(offer: OfferRow) {
    setActionError(null);
    setBusyOfferId(offer.id);
    try {
      // Sambung ke draft pesanan supplier ini bila sudah ada (perilaku
      // "keranjang" - produk yang di-"Pesan" berulang untuk supplier yang
      // sama akan menumpuk di draft yang sama), atau buat draft baru.
      const draftRes = await fetch(
        `/api/purchase-orders?supplierId=${offer.supplierId}&status=DRAFT`,
      );
      if (!draftRes.ok) throw new Error("Gagal memeriksa draft pesanan supplier ini.");
      const draftData = (await draftRes.json()) as { orders: { id: string }[] };
      let orderId = draftData.orders[0]?.id;

      if (!orderId) {
        const createRes = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId: offer.supplierId }),
        });
        const createPayload = (await createRes.json().catch(() => null)) as {
          order?: { id: string };
          error?: string;
        } | null;
        if (!createRes.ok || !createPayload?.order) {
          throw new Error(createPayload?.error ?? "Gagal membuat pesanan baru.");
        }
        orderId = createPayload.order.id;
      }

      const itemRes = await fetch(`/api/purchase-orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierProductId: offer.id, packageQty: qtyFor(offer.id) }),
      });
      if (!itemRes.ok) {
        const payload = (await itemRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Gagal menambahkan produk ke pesanan.");
      }

      // TIDAK pindah halaman (permintaan pengguna 2026-08-21): supaya bisa
      // langsung klik produk lain tanpa "muter-muter", bukan dilempar ke
      // halaman Pesanan tiap kali menambah 1 barang. Halaman Pesanan jadi
      // langkah konfirmasi/kirim terpisah, diakses lewat ikon keranjang.
      setAddedOfferIds((current) => new Set(current).add(offer.id));
      setBusyOfferId(null);
      router.refresh(); // supaya badge keranjang di header ikut ter-update
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Terjadi kesalahan. Coba lagi.");
      setBusyOfferId(null);
    }
  }

  const tone = product.category ? categoryTone(product.category.id) : "slate";

  if (!product.isActive) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {product.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto dari tautan bebas/Supabase Storage
            <img
              src={product.photoUrl}
              alt={product.productName}
              className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover opacity-50"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <NavIcon
                name={product.unitFamily === "WEIGHT" ? "scale" : "package"}
                className="h-7 w-7"
              />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">{product.productName}</h3>
            <p className="truncate text-xs text-slate-500">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-500">
            Produk ini sedang nonaktif, jadi belum bisa dipesan. Aktifkan lagi lewat halaman edit
            kalau mau dipakai lagi.
          </p>
          <Link
            href={`/produk/${product.id}`}
            className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Buka halaman edit produk →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto dari tautan bebas/Supabase Storage
          <img
            src={product.photoUrl}
            alt={product.productName}
            className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            <NavIcon
              name={product.unitFamily === "WEIGHT" ? "scale" : "package"}
              className="h-7 w-7"
            />
          </div>
        )}
        <div className="min-w-0">
          {product.category ? (
            <Badge tone={tone} className="mb-1">
              {product.category.name}
            </Badge>
          ) : null}
          <h3 className="truncate text-sm font-semibold text-slate-900">{product.productName}</h3>
          <p className="truncate text-xs text-slate-500">SKU: {product.sku}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Pesan dari Supplier
        </h4>

        {loadError ? (
          <p className="text-sm text-red-600" role="alert">
            {loadError}
          </p>
        ) : offers === null ? (
          <p className="text-sm text-slate-500">Memuat daftar supplier...</p>
        ) : offers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">Belum ada supplier untuk produk ini.</p>
            <Link
              href={`/produk/${product.id}`}
              className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Tambah penawaran supplier →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {offers.map((offer) => (
              <li
                key={offer.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {offer.supplierName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatRupiah(Number(offer.pricePerPackage))} / {offer.packageTypeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button
                      type="button"
                      className="min-h-9 w-8 text-slate-500 hover:text-slate-800"
                      onClick={() => setQty(offer.id, qtyFor(offer.id) - 1)}
                      disabled={busyOfferId === offer.id}
                      aria-label="Kurangi jumlah"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center text-sm text-slate-900">
                      {qtyFor(offer.id)}
                    </span>
                    <button
                      type="button"
                      className="min-h-9 w-8 text-slate-500 hover:text-slate-800"
                      onClick={() => setQty(offer.id, qtyFor(offer.id) + 1)}
                      disabled={busyOfferId === offer.id}
                      aria-label="Tambah jumlah"
                    >
                      +
                    </button>
                  </div>
                  {addedOfferIds.has(offer.id) ? (
                    <span className="min-h-9 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Ditambahkan
                    </span>
                  ) : (
                    <Button
                      className="min-h-9 px-3 text-xs"
                      disabled={busyOfferId !== null}
                      onClick={() => handleQuickOrder(offer)}
                    >
                      {busyOfferId === offer.id ? "..." : "Pesan"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {actionError ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {addedOfferIds.size > 0 ? (
        <Button className="w-full" variant="secondary" onClick={onClose}>
          Selesai, Pilih Produk Lain
        </Button>
      ) : null}

      <div className="border-t border-slate-100 pt-3 text-center">
        <Link
          href={`/produk/${product.id}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Lihat/Edit Detail Produk
        </Link>
      </div>
    </div>
  );
}
