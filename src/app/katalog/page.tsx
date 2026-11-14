import type { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/db/prisma";
import { listProducts } from "@/lib/server/repositories/product-repository";
import { LogoZoya } from "@/components/app-shell/LogoZoya";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRupiah } from "@/lib/format/currency";
import { BASE_UNIT_LABELS } from "@/lib/format/units";

export const metadata: Metadata = {
  title: "Katalog Harga | TOKO ZOYA",
  description:
    "Katalog harga grosir TOKO ZOYA — harga jual per satuan, bisa dibagikan lewat WhatsApp.",
};
export const dynamic = "force-dynamic";

/**
 * Katalog harga publik — halaman ini TIDAK memakai login dan TIDAK memakai
 * AppShell, supaya tautannya bisa dibagikan ke pelanggan lewat WhatsApp.
 *
 * Yang ditampilkan hanya yang aman untuk publik: nama produk, harga JUAL
 * per satuan dasar, dan ketersediaan (Tersedia/Habis). Harga BELI, nama
 * supplier, margin, dan jumlah stok persis TIDAK PERNAH tampil di sini.
 * Hanya produk aktif yang sudah punya harga jual yang muncul; produk yang
 * harganya belum diatur tidak ikut tampil.
 *
 * Toko diambil dari business aktif pertama — deployment ini melayani satu
 * toko (TOKO ZOYA). Bila suatu saat ada toko kedua, rute ini perlu
 * dipetakan per toko (mis. lewat slug) sebelum dipakai untuk toko lain.
 */
export default async function KatalogHargaPage() {
  const business = await prisma.business.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, defaultAddress: true },
  });

  if (!business) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Katalog belum tersedia"
          description="Toko belum diatur. Silakan hubungi pemilik toko."
        />
      </main>
    );
  }

  const products = await listProducts(business.id);
  const priced = products
    .filter((product) => product.sellPricePerBaseUnit !== null)
    .map((product) => ({
      id: product.id,
      productName: product.productName,
      categoryName: product.category?.name ?? "Lainnya",
      photoUrl: product.photoUrl,
      baseUnit: product.baseUnit,
      sellPricePerBaseUnit: Number(product.sellPricePerBaseUnit),
      available: Number(product.stockQty) > 0,
    }));

  // Kelompokkan per kategori, kategori urut abjad, produk urut nama.
  const byCategory = new Map<string, typeof priced>();
  for (const product of priced) {
    const group = byCategory.get(product.categoryName) ?? [];
    group.push(product);
    byCategory.set(product.categoryName, group);
  }
  const categories = [...byCategory.keys()].sort((a, b) => a.localeCompare(b, "id"));

  return (
    <main className="mx-auto max-w-2xl px-4 pt-10 pb-16">
      <header className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <LogoZoya size={56} />
        </div>
        <h1 className="font-display text-slate text-[34px] leading-tight font-semibold">
          {business.name}
        </h1>
        <p className="text-muted mt-1 text-[13px] tracking-[0.2em]">GROSIR SEMBAKO</p>
        <p className="text-muted mt-3 text-sm">
          Katalog harga grosir — harga per satuan. Harga dapat berubah sewaktu-waktu.
        </p>
        {business.defaultAddress ? (
          <p className="text-muted mt-1 text-sm">{business.defaultAddress}</p>
        ) : null}
      </header>

      {priced.length === 0 ? (
        <EmptyState
          title="Belum ada harga di katalog"
          description="Harga jual produk sedang disiapkan. Silakan hubungi toko untuk menanyakan harga."
        />
      ) : (
        <>
          {categories.length > 1 ? (
            <nav aria-label="Kategori" className="mb-6 flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <a
                  key={category}
                  href={`#kategori-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className="border-divider text-slate hover:border-cloud rounded-full border bg-white px-3 py-1.5 text-sm font-medium"
                >
                  {category} ({byCategory.get(category)?.length ?? 0})
                </a>
              ))}
            </nav>
          ) : null}

          {categories.map((category) => (
            <section
              key={category}
              id={`kategori-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="mb-8 scroll-mt-4"
            >
              <h2 className="font-display text-slate mb-3 text-xl font-semibold">{category}</h2>
              <div className="border-divider divide-divider divide-y overflow-hidden rounded-[20px] border bg-white">
                {(byCategory.get(category) ?? []).map((product) => (
                  <div key={product.id} className="flex items-center gap-3 px-4 py-3">
                    {product.photoUrl ? (
                      <span className="bg-page flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                        <Image
                          src={product.photoUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="h-full w-full object-contain p-1"
                        />
                      </span>
                    ) : (
                      <span className="bg-page flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg text-slate-400">
                        ▦
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">
                        {product.productName}
                      </span>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.available
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.available ? "Tersedia" : "Habis"}
                      </span>
                    </span>
                    <span className="text-right font-semibold whitespace-nowrap text-slate-900">
                      {formatRupiah(product.sellPricePerBaseUnit)}
                      <span className="text-muted block text-xs font-normal">
                        /{BASE_UNIT_LABELS[product.baseUnit]}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="text-muted text-center text-xs">
            Harga di atas adalah harga jual per satuan ({Object.values(BASE_UNIT_LABELS).join(", ")}
            ). Untuk pemesanan dan harga kulakan jumlah besar, hubungi toko.
          </p>
        </>
      )}
    </main>
  );
}
