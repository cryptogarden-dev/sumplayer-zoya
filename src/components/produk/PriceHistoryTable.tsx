import { formatRupiah } from "@/lib/format/currency";
import { formatTanggalIndonesia } from "@/lib/format/date";
import {
  BASE_UNIT_LABELS,
  MEASUREMENT_UNIT_LABELS,
  PACKAGING_TYPE_LABELS,
  TAX_STATUS_LABELS,
} from "@/lib/format/units";
import type { BaseUnit, MeasurementUnit, PackagingType } from "@generated/prisma/client";

/**
 * Tabel riwayat harga beli satu produk (perbaikan #5). Baris sudah
 * diurutkan terbaru dulu oleh repository; komponen ini hanya presentasi.
 * Harga per satuan dasar sudah termasuk pajak. Perubahan dihitung vs
 * entri sebelumnya dari penawaran yang sama — baris pertama tiap
 * penawaran menampilkan "—".
 */
export interface PriceHistoryTableRow {
  id: string;
  /** ISO string. */
  date: string;
  source: "PENAWARAN" | "PEMBELIAN";
  supplierName: string;
  orderNumber: string | null;
  packageType: PackagingType;
  itemsPerPackage: string;
  contentPerItem: string;
  contentUnit: MeasurementUnit;
  totalPackageContent: string;
  baseUnit: BaseUnit;
  taxStatus: "INCLUDED" | "EXCLUDED" | "NONE";
  pricePerPackage: string;
  pricePerBaseUnit: string;
  change: {
    amountChange: string;
    percentChange: string | null;
    direction: "NAIK" | "TURUN" | "TETAP";
  } | null;
}

const percentFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function PriceHistoryTable({ rows }: { rows: PriceHistoryTableRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="px-3 py-2 font-medium">Tanggal</th>
            <th className="px-3 py-2 font-medium">Sumber</th>
            <th className="px-3 py-2 font-medium">Supplier</th>
            <th className="px-3 py-2 font-medium">Kemasan</th>
            <th className="px-3 py-2 text-right font-medium">Harga/kemasan</th>
            <th className="px-3 py-2 text-right font-medium">Harga/satuan dasar</th>
            <th className="px-3 py-2 text-right font-medium">Perubahan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const change = row.change;
            return (
              <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-3 py-2 whitespace-nowrap text-slate-900">
                  {formatTanggalIndonesia(row.date)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.source === "PEMBELIAN" ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Pembelian {row.orderNumber}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Penawaran
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-900">{row.supplierName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {PACKAGING_TYPE_LABELS[row.packageType]} · {Number(row.itemsPerPackage)} x{" "}
                  {Number(row.contentPerItem)} {MEASUREMENT_UNIT_LABELS[row.contentUnit]} ={" "}
                  {Number(row.totalPackageContent)} {BASE_UNIT_LABELS[row.baseUnit]}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-slate-900">
                  {formatRupiah(row.pricePerPackage)}
                  <span className="block text-xs text-slate-500">
                    {TAX_STATUS_LABELS[row.taxStatus]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium whitespace-nowrap text-slate-900">
                  {formatRupiah(row.pricePerBaseUnit)}/{BASE_UNIT_LABELS[row.baseUnit]}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {change === null ? (
                    <span className="text-slate-400">—</span>
                  ) : change.direction === "TETAP" ? (
                    <span className="text-slate-500">Tetap</span>
                  ) : (
                    <span
                      className={
                        change.direction === "NAIK"
                          ? "font-medium text-red-600"
                          : "font-medium text-emerald-600"
                      }
                    >
                      {change.direction === "NAIK" ? "▲ " : "▼ "}
                      {formatRupiah(Math.abs(Number(change.amountChange)))}
                      {change.percentChange !== null
                        ? ` (${percentFormatter.format(Math.abs(Number(change.percentChange)))}%)`
                        : ""}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
