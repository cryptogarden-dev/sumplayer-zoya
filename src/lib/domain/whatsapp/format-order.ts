import { Decimal } from "decimal.js";
import { formatRupiah } from "@/lib/format/currency";
import { formatTanggalIndonesia } from "@/lib/format/date";
import { INDONESIAN_PHONE_REGEX } from "@/lib/validation/phone";

/**
 * Format pesan pemesanan siap-kirim WhatsApp (Tahap 4, R17). Fungsi murni
 * (tidak membuka jendela apa pun) — hanya menghasilkan teks & tautan
 * `wa.me`. Efek samping (`window.open`) menjadi tanggung jawab komponen
 * UI pemanggil.
 */
export interface WhatsAppOrderMessageInput {
  supplierName: string;
  productName: string;
  /** Label kemasan yang sudah dilokalkan, mis. "Karung". */
  packageTypeLabel: string;
  supplierSkuOrName?: string | null;
  packagesToBuy: Decimal.Value;
  actualQuantity: Decimal.Value;
  /** Label satuan dasar yang sudah dilokalkan, mis. "kg". */
  baseUnitLabel: string;
  /** Total biaya (subtotal + ongkir). `null` = ongkir belum diketahui — TIDAK ditampilkan seolah nol. */
  totalCost: Decimal.Value | null;
  neededByDate: Date;
  notes?: string;
}

export function formatWhatsAppOrderMessage(input: WhatsAppOrderMessageInput): string {
  const packages = new Decimal(input.packagesToBuy);
  const actual = new Decimal(input.actualQuantity);
  const productLine = input.supplierSkuOrName
    ? `${input.productName} (${input.supplierSkuOrName})`
    : input.productName;

  const lines = [
    `Assalamualaikum, ${input.supplierName}.`,
    "",
    "Saya ingin memesan:",
    `- ${productLine}`,
    `  ${packages.toString()} ${input.packageTypeLabel} (± ${actual.toString()} ${input.baseUnitLabel})`,
    "",
    `Kebutuhan sebelum: ${formatTanggalIndonesia(input.neededByDate)}`,
    `Estimasi total: ${input.totalCost === null ? "menunggu konfirmasi ongkir" : formatRupiah(input.totalCost.toString())}`,
  ];

  if (input.notes) {
    lines.push("", `Catatan: ${input.notes}`);
  }

  lines.push("", "Mohon konfirmasi ketersediaan dan estimasi waktu pengiriman. Terima kasih.");

  return lines.join("\n");
}

export interface WhatsAppPurchaseOrderItemInput {
  productName: string;
  brand?: string | null;
  variant?: string | null;
  /**
   * Label kuantitas yang SUDAH DIPUTUSKAN oleh pemanggil, mis. "5 Renceng"
   * atau "1,25 kg" (permintaan pengguna 2026-08-20: produk berbasis berat/
   * volume - seperti Aci - ditampilkan dalam kg/liter, BUKAN jumlah
   * kemasan kecil seperti "Pak", supaya jelas bagi supplier). Keputusan
   * mana yang dipakai (kemasan vs satuan dasar) dihitung di
   * `PesananWorkspace.tsx` yang punya akses ke `baseUnit`/`totalPackageContent`.
   */
  quantityLabel: string;
}

export interface WhatsAppPurchaseOrderMessageInput {
  supplierName: string;
  items: WhatsAppPurchaseOrderItemInput[];
  notes?: string | null;
}

/**
 * Format pesan pemesanan MULTI-PRODUK siap-kirim WhatsApp (R16/R17,
 * versi revisi disepakati 2026-08-18 - lihat docs/BACKLOG.md #2).
 * SENGAJA TIDAK menyertakan harga/estimasi total - harga belum pasti
 * sampai dikonfirmasi balik oleh supplier, jadi tidak dikirim sebagai
 * komitmen. Harga tetap tersimpan & terlihat di aplikasi untuk catatan
 * internal (lihat `PurchaseOrderItem.pricePerPackageSnapshot`), hanya
 * tidak dicantumkan dalam teks yang dikirim ke supplier.
 */
export function formatWhatsAppPurchaseOrderMessage(
  input: WhatsAppPurchaseOrderMessageInput,
): string {
  const itemLines = input.items.map((item, index) => {
    const namePart = [item.productName, item.brand, item.variant].filter(Boolean).join(" ");
    return `${index + 1}. ${namePart} : ${item.quantityLabel}`;
  });

  const lines = [
    `Assalamualaikum, ${input.supplierName}.`,
    "",
    "Saya ingin memesan:",
    ...itemLines,
  ];

  if (input.notes) {
    lines.push("", `Catatan: ${input.notes}`);
  }

  lines.push("", "Mohon konfirmasi ketersediaan dan estimasi waktu pengiriman. Terima kasih.");

  return lines.join("\n");
}

/**
 * Menormalkan nomor telepon Indonesia (`08xx`, `+628xx`, atau `628xx`) ke
 * format digit yang dipakai `wa.me` (`628xx`, tanpa `+`/awalan `0`).
 * Menolak nomor yang tidak sesuai format Indonesia yang sudah divalidasi
 * di `lib/validation/phone.ts` (satu sumber kebenaran validasi).
 */
export function toWhatsAppDigits(phone: string): string {
  const trimmed = phone.replace(/[\s-]/g, "");
  if (!INDONESIAN_PHONE_REGEX.test(trimmed)) {
    throw new Error("Nomor WhatsApp/telepon tidak sesuai format Indonesia yang valid.");
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  return digitsOnly.startsWith("0") ? `62${digitsOnly.slice(1)}` : digitsOnly;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppDigits(phone)}?text=${encodeURIComponent(message)}`;
}
