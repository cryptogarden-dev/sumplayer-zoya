import type {
  PaymentMethod,
  PurchaseOrderItemAvailability,
  PurchaseOrderStatus,
} from "@/lib/domain/orders/types";

/**
 * Label Bahasa Indonesia untuk enum pesanan (R24/NFR-04 - lokalisasi).
 * HANYA untuk presentasi; nilai enum aslinya tetap dipakai untuk logika
 * dan penyimpanan.
 */
export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  DIPESAN: "Dipesan",
  DIKONFIRMASI: "Dikonfirmasi",
  DIKIRIM: "Dikirim",
  DITERIMA: "Diterima",
  DIBATALKAN: "Dibatalkan",
};

export const PURCHASE_ORDER_ITEM_AVAILABILITY_LABELS: Record<
  PurchaseOrderItemAvailability,
  string
> = {
  BELUM_DIKONFIRMASI: "Belum Dikonfirmasi",
  TERSEDIA: "Tersedia",
  SEBAGIAN: "Sebagian",
  TIDAK_TERSEDIA: "Tidak Tersedia",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TUNAI: "Tunai",
  TRANSFER: "Transfer",
};
