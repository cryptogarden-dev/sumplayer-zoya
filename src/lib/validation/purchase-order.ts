import { z } from "zod";
import { PAYMENT_METHODS, PURCHASE_ORDER_ITEM_AVAILABILITIES } from "@/lib/domain/orders/types";
import { optionalText } from "@/lib/validation/common";

/**
 * Pesanan ke satu supplier (R16, pengembangan lanjutan disepakati
 * 2026-08-18 - lihat docs/BACKLOG.md #2). `supplierId` menentukan
 * supplier tujuan draft; item ditambahkan belakangan lewat
 * `purchaseOrderItemInputSchema`.
 */
export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Supplier wajib dipilih"),
  locationId: z.string().uuid().optional(),
  notes: optionalText(1000),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

/**
 * Satu baris produk yang ditambahkan ke draft pesanan. Harga/pajak TIDAK
 * diterima dari klien - server selalu mengambil snapshot dari
 * `SupplierPrice` aktif milik `supplierProductId` ini (Keamanan: "jangan
 * percaya nilai perhitungan dari client").
 */
export const purchaseOrderItemInputSchema = z.object({
  supplierProductId: z.string().uuid("Produk/penawaran wajib dipilih"),
  packageQty: z.number().positive("Jumlah kemasan harus lebih dari nol"),
  notes: optionalText(500),
});

export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemInputSchema>;

export const updatePurchaseOrderItemQtySchema = z.object({
  packageQty: z.number().positive("Jumlah kemasan harus lebih dari nol"),
});

export type UpdatePurchaseOrderItemQtyInput = z.infer<typeof updatePurchaseOrderItemQtySchema>;

/**
 * Status ketersediaan per baris, diisi manual setelah balasan WhatsApp
 * supplier (lihat komentar `PurchaseOrderItemAvailability` di
 * `src/lib/domain/orders/types.ts`). `confirmedPackageQty` WAJIB diisi
 * hanya untuk status `SEBAGIAN`.
 */
export const purchaseOrderItemAvailabilitySchema = z
  .object({
    availabilityStatus: z.enum(PURCHASE_ORDER_ITEM_AVAILABILITIES),
    confirmedPackageQty: z.number().positive("Jumlah dikonfirmasi harus lebih dari nol").optional(),
  })
  .refine(
    (data) => data.availabilityStatus !== "SEBAGIAN" || data.confirmedPackageQty !== undefined,
    {
      message: "Isi jumlah yang dikonfirmasi tersedia untuk status Sebagian.",
      path: ["confirmedPackageQty"],
    },
  )
  .refine(
    (data) => data.availabilityStatus === "SEBAGIAN" || data.confirmedPackageQty === undefined,
    {
      message: "Jumlah dikonfirmasi hanya diisi untuk status Sebagian.",
      path: ["confirmedPackageQty"],
    },
  );

export type PurchaseOrderItemAvailabilityInput = z.infer<
  typeof purchaseOrderItemAvailabilitySchema
>;

export const confirmPurchaseOrderSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
});

export type ConfirmPurchaseOrderInput = z.infer<typeof confirmPurchaseOrderSchema>;

export const cancelPurchaseOrderSchema = z.object({
  cancelReason: z.string().trim().min(1, "Alasan pembatalan wajib diisi (R29).").max(500),
});

export type CancelPurchaseOrderInput = z.infer<typeof cancelPurchaseOrderSchema>;
