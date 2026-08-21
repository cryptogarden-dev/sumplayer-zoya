"use client";

import { Button } from "@/components/ui/Button";
import { LabelBadgeList } from "@/components/perbandingan/LabelBadge";
import { formatRupiah } from "@/lib/format/currency";
import { formatTanggalIndonesia } from "@/lib/format/date";
import { AVAILABILITY_STATUS_LABELS } from "@/lib/format/units";
import {
  baseUnitLabel,
  buildRowWhatsAppUrl,
  formatQty,
  packagingLabel,
} from "@/components/perbandingan/row-helpers";
import type { ComparisonRowDto, SortKey } from "@/components/perbandingan/types";
import type { AvailabilityStatus } from "@/lib/domain/pricing/types";

interface ComparisonTableProps {
  rows: ComparisonRowDto[];
  productName: string;
  neededByDate: Date;
  selectedOfferId: string | null;
  onSelect: (offerId: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
}

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "unitPrice", label: "Harga Satuan" },
  { key: "totalCost", label: "Total Biaya" },
  { key: "arrival", label: "Estimasi Tiba" },
  { key: "distance", label: "Jarak" },
  { key: "reliability", label: "Ketepatan Waktu" },
];

function Th({
  sortKey,
  label,
  activeSortKey,
  onSortKeyChange,
}: {
  sortKey: SortKey;
  label: string;
  activeSortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;
  return (
    <th className="px-3 py-2 text-left font-semibold text-slate-600">
      <button
        type="button"
        onClick={() => onSortKeyChange(sortKey)}
        className="inline-flex items-center gap-1 hover:text-indigo-600"
      >
        {label} {isActive ? "▲" : ""}
      </button>
    </th>
  );
}

export function ComparisonTable({
  rows,
  productName,
  neededByDate,
  selectedOfferId,
  onSelect,
  sortKey,
  onSortKeyChange,
}: ComparisonTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Supplier</th>
            <th className="px-3 py-2 font-semibold">Label</th>
            <th className="px-3 py-2 font-semibold">Stok</th>
            <th className="px-3 py-2 font-semibold">Kemasan</th>
            {SORT_COLUMNS.map((col) => (
              <Th
                key={col.key}
                sortKey={col.key}
                label={col.label}
                activeSortKey={sortKey}
                onSortKeyChange={onSortKeyChange}
              />
            ))}
            <th className="px-3 py-2 font-semibold">Total</th>
            <th className="px-3 py-2 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const whatsappUrl = buildRowWhatsAppUrl(row, productName, neededByDate);
            const isSelected = row.offerId === selectedOfferId;

            return (
              <tr key={row.offerId} className={isSelected ? "bg-indigo-50" : undefined}>
                <td className="px-3 py-2 align-top">
                  <p className="font-semibold text-slate-900">{row.supplier.name}</p>
                  <p className="text-xs text-slate-500">
                    {row.supplier.city}, {row.supplier.province}
                  </p>
                </td>
                <td className="px-3 py-2 align-top">
                  <LabelBadgeList labels={row.labels} />
                </td>
                <td className="px-3 py-2 align-top">
                  {AVAILABILITY_STATUS_LABELS[row.stock.availabilityStatus as AvailabilityStatus]}
                </td>
                <td className="px-3 py-2 align-top">
                  {formatQty(row.purchase.packagesToBuy)}{" "}
                  {packagingLabel(row.packaging.packageType)}
                  <br />
                  <span className="text-xs text-slate-500">
                    ≈ {formatQty(row.purchase.actualQuantityInBaseUnit)}{" "}
                    {baseUnitLabel(row.packaging.baseUnit)}
                  </span>
                </td>
                <td className="px-3 py-2 align-top">
                  {row.money.finalPricePerBaseUnit === null ? (
                    <span className="text-amber-700">Perlu konfirmasi</span>
                  ) : (
                    formatRupiah(row.money.finalPricePerBaseUnit)
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {row.money.totalCost === null ? (
                    <span className="text-amber-700">Perlu konfirmasi</span>
                  ) : (
                    formatRupiah(row.money.totalCost)
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {formatTanggalIndonesia(row.delivery.estimatedArrivalMax)}
                </td>
                <td className="px-3 py-2 align-top">
                  {row.proximity.score === null
                    ? "—"
                    : row.proximity.level === "CITY"
                      ? "Sekota"
                      : "Seprovinsi"}
                </td>
                <td className="px-3 py-2 align-top">{row.reliability.message}</td>
                <td className="px-3 py-2 align-top font-semibold">
                  {row.money.totalCost === null ? (
                    <span className="text-amber-700">Perlu konfirmasi</span>
                  ) : (
                    formatRupiah(row.money.totalCost)
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant={isSelected ? "primary" : "secondary"}
                      className="min-h-9 px-3 text-xs"
                      onClick={() => onSelect(row.offerId)}
                    >
                      {isSelected ? "Terpilih" : "Pilih"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-9 px-3 text-xs"
                      disabled={!whatsappUrl}
                      title={whatsappUrl ? undefined : "Nomor WhatsApp/HP belum tersedia"}
                      onClick={() =>
                        whatsappUrl && window.open(whatsappUrl, "_blank", "noopener,noreferrer")
                      }
                    >
                      WhatsApp
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
