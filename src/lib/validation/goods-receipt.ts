import { z } from "zod";
import { optionalText } from "@/lib/validation/common";

/**
 * Penerimaan barang (R18, Tahap 5). Jumlah dalam KEMASAN (bukan satuan
 * dasar) agar sebanding langsung dengan `packageQty` pesanan.
 *
 * Aturan yang ditegakkan di sini (dan diulang di service layer, karena
 * validasi klien tidak boleh dipercaya):
 * - baik + rusak <= diterima per baris
 * - harga sebenarnya wajib diisi bila harga tidak sesuai
 * - minimal 1 baris dan total diterima > 0 (penerimaan kosong tidak ada artinya)
 */
export const goodsReceiptItemInputSchema = z
  .object({
    purchaseOrderItemId: z.string().uuid("Baris pesanan wajib dipilih"),
    receivedQty: z.number().nonnegative("Jumlah diterima tidak boleh negatif"),
    conditionGoodQty: z.number().nonnegative("Jumlah kondisi baik tidak boleh negatif"),
    conditionDamagedQty: z.number().nonnegative("Jumlah kondisi rusak tidak boleh negatif"),
    priceMatches: z.boolean(),
    actualPricePerPackage: z.number().positive("Harga sebenarnya harus lebih dari nol").optional(),
    notes: optionalText(500),
  })
  .refine((data) => data.conditionGoodQty + data.conditionDamagedQty <= data.receivedQty, {
    message: "Jumlah baik + rusak tidak boleh lebih dari jumlah diterima.",
    path: ["conditionDamagedQty"],
  })
  .refine((data) => data.priceMatches || data.actualPricePerPackage !== undefined, {
    message: "Isi harga sebenarnya per kemasan bila harga tidak sesuai.",
    path: ["actualPricePerPackage"],
  });

export type GoodsReceiptItemInput = z.infer<typeof goodsReceiptItemInputSchema>;

export const goodsReceiptInputSchema = z
  .object({
    items: z.array(goodsReceiptItemInputSchema).min(1, "Minimal 1 baris produk."),
    onTime: z.boolean(),
    notes: optionalText(1000),
    receiptPhotoUrl: optionalText(1000),
  })
  .refine((data) => data.items.reduce((sum, item) => sum + item.receivedQty, 0) > 0, {
    message: "Total barang yang diterima harus lebih dari nol.",
    path: ["items"],
  });

export type GoodsReceiptInput = z.infer<typeof goodsReceiptInputSchema>;
