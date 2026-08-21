/**
 * Enum pesanan (R16, pengembangan lanjutan disepakati 2026-08-18 - lihat
 * docs/BACKLOG.md #2). Harus identik dengan enum Prisma yang senama di
 * `prisma/schema.prisma` (satu sumber kebenaran untuk validasi & skema).
 */
export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "DIPESAN",
  "DIKONFIRMASI",
  "DIKIRIM",
  "DITERIMA",
  "DIBATALKAN",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

/**
 * Status ketersediaan per baris produk dalam pesanan. Diisi MANUAL oleh
 * pengguna setelah membaca balasan supplier di WhatsApp - tidak ada
 * integrasi otomatis.
 */
export const PURCHASE_ORDER_ITEM_AVAILABILITIES = [
  "BELUM_DIKONFIRMASI",
  "TERSEDIA",
  "SEBAGIAN",
  "TIDAK_TERSEDIA",
] as const;
export type PurchaseOrderItemAvailability = (typeof PURCHASE_ORDER_ITEM_AVAILABILITIES)[number];

/** Metode konfirmasi pembayaran (pencatatan pilihan saja, bukan payment gateway). */
export const PAYMENT_METHODS = ["TUNAI", "TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
