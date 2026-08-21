"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { formatRupiah } from "@/lib/format/currency";
import {
  PAYMENT_METHOD_LABELS,
  PURCHASE_ORDER_ITEM_AVAILABILITY_LABELS,
  PURCHASE_ORDER_STATUS_LABELS,
} from "@/lib/format/orders";
import { PAYMENT_METHODS, PURCHASE_ORDER_ITEM_AVAILABILITIES } from "@/lib/domain/orders/types";
import type { PaymentMethod, PurchaseOrderItemAvailability } from "@/lib/domain/orders/types";
import type { BaseUnit } from "@/lib/domain/units/types";
import { BASE_UNIT_LABELS } from "@/lib/format/units";
import {
  buildWhatsAppLink,
  formatWhatsAppPurchaseOrderMessage,
} from "@/lib/domain/whatsapp/format-order";

interface OrderItemView {
  id: string;
  productName: string;
  brand: string | null;
  variant: string | null;
  packageTypeLabel: string;
  packageQty: string;
  /** Isi satu kemasan dalam satuan dasar, mis. 0.25 (kg) untuk Aci 1 Pak. */
  totalPackageContent: string;
  baseUnit: BaseUnit;
  pricePerPackageSnapshot: string;
  lineSubtotal: string;
  availabilityStatus: PurchaseOrderItemAvailability;
  confirmedPackageQty: string | null;
}

/**
 * Label kuantitas untuk pesan WhatsApp (permintaan pengguna 2026-08-20):
 * produk berbasis BERAT/VOLUME (mis. Aci - dijual per kg meski dikemas
 * per 1/4 kg) ditampilkan dalam kg/liter TOTAL, bukan jumlah kemasan kecil
 * seperti "5 Pak" yang membingungkan. Produk berbasis JUMLAH (Dus/Renceng
 * dst - Teh Gelas, Torpedo, kopi sachet) tetap ditampilkan sebagai jumlah
 * kemasan, karena itu memang cara wajar memesannya ke supplier.
 */
function quantityLabelForItem(item: OrderItemView): string {
  if (item.baseUnit === "PCS") {
    return `${item.packageQty} ${item.packageTypeLabel}`;
  }
  const totalInBaseUnit = Number(item.packageQty) * Number(item.totalPackageContent);
  const formatted = Number.isInteger(totalInBaseUnit)
    ? totalInBaseUnit.toString()
    : totalInBaseUnit.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted} ${BASE_UNIT_LABELS[item.baseUnit]}`;
}

interface AvailableOfferView {
  id: string;
  productName: string;
  brand: string | null;
  variant: string | null;
  packageTypeLabel: string;
  pricePerPackage: string;
  category: { id: string; name: string } | null;
}

const ALL_CATEGORIES = "__all__";
const NO_CATEGORY = "__none__";

interface OrderView {
  id: string;
  status: string;
  orderNumber: string | null;
  supplierName: string;
  supplierWhatsapp: string | null;
  supplierPhone: string | null;
  notes: string | null;
  cancelReason: string | null;
  paymentMethod: PaymentMethod | null;
  items: OrderItemView[];
}

function displayName(item: { productName: string; brand: string | null; variant: string | null }) {
  return [item.productName, item.brand, item.variant].filter(Boolean).join(" ");
}

/**
 * Ruang kerja satu pesanan (R16/R17, pengembangan lanjutan disepakati
 * 2026-08-18 - lihat docs/BACKLOG.md #2). Tampilan berubah sesuai status:
 * DRAFT (susun daftar produk) -> DIPESAN (tandai ketersediaan per baris
 * setelah balasan WhatsApp supplier) -> DIKONFIRMASI (metode bayar
 * dipilih, ringkasan final).
 */
export function PesananWorkspace({
  order,
  orderTotal,
  availableOffers,
}: {
  order: OrderView;
  orderTotal: string;
  availableOffers: AvailableOfferView[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Form tambah produk (DRAFT saja) - dikelompokkan per kategori produk
  // (permintaan pengguna 2026-08-20: supplier sudah punya kategori, jadi
  // pemilihan produk saat menyusun pesanan seharusnya memanfaatkannya juga).
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);

  const offerCategories = useMemo(() => {
    const map = new Map<string, string>();
    let hasUncategorized = false;
    for (const offer of availableOffers) {
      if (offer.category) map.set(offer.category.id, offer.category.name);
      else hasUncategorized = true;
    }
    return {
      list: Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      hasUncategorized,
    };
  }, [availableOffers]);

  const filteredOffers = useMemo(() => {
    if (activeCategory === ALL_CATEGORIES) return availableOffers;
    if (activeCategory === NO_CATEGORY) return availableOffers.filter((offer) => !offer.category);
    return availableOffers.filter((offer) => offer.category?.id === activeCategory);
  }, [availableOffers, activeCategory]);

  const [selectedOfferId, setSelectedOfferId] = useState(availableOffers[0]?.id ?? "");
  const [newQty, setNewQty] = useState("1");

  function handleCategoryChip(categoryKey: string) {
    setActiveCategory(categoryKey);
    const nextOffers =
      categoryKey === ALL_CATEGORIES
        ? availableOffers
        : categoryKey === NO_CATEGORY
          ? availableOffers.filter((offer) => !offer.category)
          : availableOffers.filter((offer) => offer.category?.id === categoryKey);
    setSelectedOfferId(nextOffers[0]?.id ?? "");
  }

  // Form batalkan
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Form konfirmasi
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TUNAI");

  async function callApi(url: string, method: string, body?: unknown) {
    setFormError(null);
    setIsBusy(true);
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setIsBusy(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(payload?.error ?? "Terjadi kesalahan. Coba lagi.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAddItem() {
    if (!selectedOfferId) return;
    await callApi(`/api/purchase-orders/${order.id}/items`, "POST", {
      supplierProductId: selectedOfferId,
      packageQty: Number(newQty),
    });
    setNewQty("1");
  }

  async function handleUpdateQty(itemId: string, packageQty: string) {
    const qty = Number(packageQty);
    if (!Number.isFinite(qty) || qty <= 0) return;
    await callApi(`/api/purchase-orders/${order.id}/items/${itemId}`, "PATCH", { packageQty: qty });
  }

  async function handleRemoveItem(itemId: string) {
    await callApi(`/api/purchase-orders/${order.id}/items/${itemId}`, "DELETE");
  }

  function whatsAppLinkForOrder(): string | null {
    const phone = order.supplierWhatsapp ?? order.supplierPhone;
    if (!phone) return null;
    const message = formatWhatsAppPurchaseOrderMessage({
      supplierName: order.supplierName,
      notes: order.notes,
      items: order.items.map((item) => ({
        productName: item.productName,
        brand: item.brand,
        variant: item.variant,
        quantityLabel: quantityLabelForItem(item),
      })),
    });
    try {
      return buildWhatsAppLink(phone, message);
    } catch {
      return null;
    }
  }

  async function handleSend() {
    if (order.items.length === 0) {
      setFormError("Tambahkan minimal 1 produk sebelum mengirim pesanan.");
      return;
    }
    const link = whatsAppLinkForOrder();
    const ok = await callApi(`/api/purchase-orders/${order.id}/send`, "PATCH");
    if (ok && link) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else if (ok) {
      setFormError(
        "Pesanan terkirim, tapi nomor WhatsApp/HP supplier belum tersedia untuk dibuka otomatis.",
      );
    }
  }

  async function handleUpdateAvailability(
    itemId: string,
    availabilityStatus: PurchaseOrderItemAvailability,
    confirmedPackageQty?: string,
  ) {
    await callApi(`/api/purchase-orders/${order.id}/items/${itemId}/availability`, "PATCH", {
      availabilityStatus,
      confirmedPackageQty:
        availabilityStatus === "SEBAGIAN" && confirmedPackageQty
          ? Number(confirmedPackageQty)
          : undefined,
    });
  }

  async function handleConfirm() {
    await callApi(`/api/purchase-orders/${order.id}/confirm`, "PATCH", { paymentMethod });
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      setFormError("Alasan pembatalan wajib diisi.");
      return;
    }
    await callApi(`/api/purchase-orders/${order.id}/cancel`, "PATCH", { cancelReason });
  }

  /** Hapus permanen (docs/BACKLOG.md #5) - hanya untuk DRAFT/DIBATALKAN,
   * status lain ditolak server dengan pesan yang ditampilkan lewat formError. */
  async function handleDelete() {
    if (
      !window.confirm(
        "Hapus pesanan ini secara PERMANEN? Data yang sudah dihapus tidak bisa dikembalikan.",
      )
    ) {
      return;
    }
    setFormError(null);
    setIsBusy(true);
    const response = await fetch(`/api/purchase-orders/${order.id}`, { method: "DELETE" });
    setIsBusy(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(payload?.error ?? "Gagal menghapus pesanan.");
      return;
    }
    router.push("/pesanan");
  }

  const allMarked = order.items.every((item) => item.availabilityStatus !== "BELUM_DIKONFIRMASI");
  const link = whatsAppLinkForOrder();

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-slate-500">
          Status:{" "}
          <span className="font-semibold text-slate-900">
            {PURCHASE_ORDER_STATUS_LABELS[
              order.status as keyof typeof PURCHASE_ORDER_STATUS_LABELS
            ] ?? order.status}
          </span>
        </p>
        {order.cancelReason ? (
          <p className="mt-1 text-sm text-red-600">Alasan dibatalkan: {order.cancelReason}</p>
        ) : null}
        {order.paymentMethod ? (
          <p className="mt-1 text-sm text-emerald-700">
            Metode bayar: {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </p>
        ) : null}
      </Card>

      <div className="space-y-3">
        {order.items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{displayName(item)}</h3>
                <p className="text-sm text-slate-500">
                  {item.packageQty} {item.packageTypeLabel} ·{" "}
                  {formatRupiah(Number(item.pricePerPackageSnapshot))}/{item.packageTypeLabel}
                </p>
              </div>
              <div className="text-right text-sm font-semibold text-slate-900">
                {formatRupiah(Number(item.lineSubtotal))}
              </div>
            </div>

            {order.status === "DRAFT" ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <Label htmlFor={`qty-${item.id}`}>Jumlah</Label>
                  <Input
                    id={`qty-${item.id}`}
                    type="number"
                    min="0"
                    step="any"
                    defaultValue={item.packageQty}
                    onBlur={(event) => handleUpdateQty(item.id, event.target.value)}
                    className="w-28"
                  />
                </div>
                <Button
                  variant="danger"
                  disabled={isBusy}
                  onClick={() => handleRemoveItem(item.id)}
                >
                  Hapus
                </Button>
              </div>
            ) : null}

            {order.status === "DIPESAN" ? (
              <AvailabilityEditor
                item={item}
                disabled={isBusy}
                onSave={(status, confirmedQty) =>
                  handleUpdateAvailability(item.id, status, confirmedQty)
                }
              />
            ) : null}

            {order.status !== "DRAFT" && order.status !== "DIPESAN" ? (
              <p className="mt-2 text-xs text-slate-500">
                {PURCHASE_ORDER_ITEM_AVAILABILITY_LABELS[item.availabilityStatus]}
                {item.availabilityStatus === "SEBAGIAN"
                  ? ` (${item.confirmedPackageQty} ${item.packageTypeLabel})`
                  : ""}
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      <Card>
        <p className="flex items-center justify-between text-base font-semibold text-slate-900">
          <span>Total (catatan internal, tidak dikirim ke supplier)</span>
          <span>{formatRupiah(Number(orderTotal))}</span>
        </p>
      </Card>

      {order.status === "DRAFT" ? (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Tambah Produk</h2>
          {availableOffers.length === 0 ? (
            <p className="text-sm text-slate-500">
              Supplier ini belum punya penawaran produk aktif. Tambahkan lewat menu Produk.
            </p>
          ) : (
            <div className="space-y-3">
              {offerCategories.list.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Chip
                    active={activeCategory === ALL_CATEGORIES}
                    onClick={() => handleCategoryChip(ALL_CATEGORIES)}
                  >
                    Semua ({availableOffers.length})
                  </Chip>
                  {offerCategories.list.map((category) => (
                    <Chip
                      key={category.id}
                      active={activeCategory === category.id}
                      onClick={() => handleCategoryChip(category.id)}
                    >
                      {category.name}
                    </Chip>
                  ))}
                  {offerCategories.hasUncategorized ? (
                    <Chip
                      active={activeCategory === NO_CATEGORY}
                      onClick={() => handleCategoryChip(NO_CATEGORY)}
                    >
                      Tanpa kategori
                    </Chip>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-60 flex-1">
                  <Label htmlFor="add-offer">Produk</Label>
                  <Select
                    id="add-offer"
                    value={selectedOfferId}
                    onChange={(event) => setSelectedOfferId(event.target.value)}
                  >
                    {filteredOffers.length === 0 ? (
                      <option value="">Tidak ada produk</option>
                    ) : null}
                    {filteredOffers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {displayName(offer)} ({offer.packageTypeLabel}) -{" "}
                        {formatRupiah(Number(offer.pricePerPackage))}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="add-qty">Jumlah</Label>
                  <Input
                    id="add-qty"
                    type="number"
                    min="0"
                    step="any"
                    value={newQty}
                    onChange={(event) => setNewQty(event.target.value)}
                    className="w-28"
                  />
                </div>
                <Button disabled={isBusy} onClick={handleAddItem}>
                  Tambah
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {formError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {order.status === "DRAFT" ? (
          <Button disabled={isBusy || order.items.length === 0} onClick={handleSend}>
            Kirim ke WhatsApp
          </Button>
        ) : null}

        {order.status === "DIPESAN" && link ? (
          <Button
            variant="secondary"
            onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
          >
            Buka WhatsApp Lagi
          </Button>
        ) : null}

        {(order.status === "DRAFT" || order.status === "DIPESAN") && !showCancelForm ? (
          <Button variant="danger" onClick={() => setShowCancelForm(true)}>
            Batalkan Pesanan
          </Button>
        ) : null}

        {order.status === "DRAFT" || order.status === "DIBATALKAN" ? (
          <Button variant="danger" disabled={isBusy} onClick={handleDelete}>
            Hapus Pesanan Permanen
          </Button>
        ) : null}
      </div>

      {order.status === "DIPESAN" ? (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Konfirmasi Pesanan</h2>
          {!allMarked ? (
            <p className="mb-3 text-sm text-amber-700">
              Tandai ketersediaan semua baris produk di atas sebelum konfirmasi.
            </p>
          ) : null}
          <div className="mb-3 flex flex-wrap gap-4">
            {PAYMENT_METHODS.map((method) => (
              <label key={method} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
                {PAYMENT_METHOD_LABELS[method]}
              </label>
            ))}
          </div>
          <Button disabled={isBusy || !allMarked} onClick={handleConfirm}>
            Konfirmasi Pesanan
          </Button>
        </Card>
      ) : null}

      {showCancelForm ? (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Batalkan Pesanan</h2>
          <Label htmlFor="cancel-reason">Alasan Pembatalan</Label>
          <textarea
            id="cancel-reason"
            required
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
          />
          <div className="mt-3 flex gap-3">
            <Button variant="danger" disabled={isBusy} onClick={handleCancel}>
              Konfirmasi Batalkan
            </Button>
            <Button variant="secondary" onClick={() => setShowCancelForm(false)}>
              Batal
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Editor status ketersediaan satu baris produk (status DIPESAN). Memakai
 * state lokal (bukan langsung memanggil API saat memilih dropdown) agar
 * pilihan "Sebagian" + jumlah dikonfirmasi bisa diisi dulu sebelum
 * dikirim sekali lewat tombol "Simpan" - menghindari status tersimpan
 * dalam keadaan tidak konsisten (SEBAGIAN tanpa jumlah dikonfirmasi).
 */
function AvailabilityEditor({
  item,
  disabled,
  onSave,
}: {
  item: OrderItemView;
  disabled: boolean;
  onSave: (status: PurchaseOrderItemAvailability, confirmedQty?: string) => void;
}) {
  const [status, setStatus] = useState<PurchaseOrderItemAvailability>(item.availabilityStatus);
  const [confirmedQty, setConfirmedQty] = useState(item.confirmedPackageQty ?? item.packageQty);

  const hasChanges =
    status !== item.availabilityStatus ||
    (status === "SEBAGIAN" && confirmedQty !== (item.confirmedPackageQty ?? item.packageQty));

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor={`avail-${item.id}`}>Status Ketersediaan</Label>
        <Select
          id={`avail-${item.id}`}
          value={status}
          onChange={(event) => setStatus(event.target.value as PurchaseOrderItemAvailability)}
        >
          {PURCHASE_ORDER_ITEM_AVAILABILITIES.map((option) => (
            <option key={option} value={option}>
              {PURCHASE_ORDER_ITEM_AVAILABILITY_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>
      {status === "SEBAGIAN" ? (
        <div>
          <Label htmlFor={`confirmed-${item.id}`}>Jumlah Dikonfirmasi</Label>
          <Input
            id={`confirmed-${item.id}`}
            type="number"
            min="0"
            step="any"
            value={confirmedQty}
            onChange={(event) => setConfirmedQty(event.target.value)}
            className="w-28"
          />
        </div>
      ) : null}
      <Button
        variant="secondary"
        className="min-h-9 px-3 text-xs"
        disabled={disabled || !hasChanges}
        onClick={() => onSave(status, status === "SEBAGIAN" ? confirmedQty : undefined)}
      >
        Simpan
      </Button>
    </div>
  );
}
