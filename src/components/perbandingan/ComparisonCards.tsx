"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LabelBadgeList } from "@/components/perbandingan/LabelBadge";
import { formatRupiah } from "@/lib/format/currency";
import { formatTanggalIndonesia } from "@/lib/format/date";
import { AVAILABILITY_STATUS_LABELS, TAX_STATUS_LABELS } from "@/lib/format/units";
import {
  baseUnitLabel,
  buildRowWhatsAppUrl,
  formatQty,
  packagingLabel,
} from "@/components/perbandingan/row-helpers";
import type { ComparisonRowDto } from "@/components/perbandingan/types";
import type { AvailabilityStatus, TaxStatus } from "@/lib/domain/pricing/types";

interface ComparisonCardsProps {
  rows: ComparisonRowDto[];
  productName: string;
  neededByDate: Date;
  selectedOfferId: string | null;
  onSelect: (offerId: string) => void;
}

function MoneyOrConfirm({ value }: { value: string | null }) {
  return value === null ? (
    <span className="text-amber-700">Perlu konfirmasi</span>
  ) : (
    <>{formatRupiah(value)}</>
  );
}

export function ComparisonCards({
  rows,
  productName,
  neededByDate,
  selectedOfferId,
  onSelect,
}: ComparisonCardsProps) {
  return (
    <div className="space-y-4 lg:hidden">
      {rows.map((row) => {
        const whatsappUrl = buildRowWhatsAppUrl(row, productName, neededByDate);
        const isSelected = row.offerId === selectedOfferId;

        return (
          <Card key={row.offerId} className={isSelected ? "ring-2 ring-indigo-500" : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{row.supplier.name}</h3>
                <p className="text-sm text-slate-500">
                  {row.supplier.city}, {row.supplier.province}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                {AVAILABILITY_STATUS_LABELS[row.stock.availabilityStatus as AvailabilityStatus]}
              </span>
            </div>

            <div className="mt-3">
              <LabelBadgeList labels={row.labels} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Harga akhir/satuan</p>
                <p className="text-lg font-bold text-slate-900">
                  <MoneyOrConfirm value={row.money.finalPricePerBaseUnit} />
                </p>
              </div>
              <div>
                <p className="text-slate-500">Total pembayaran</p>
                <p className="text-lg font-bold text-slate-900">
                  <MoneyOrConfirm value={row.money.totalCost} />
                </p>
              </div>
              <div>
                <p className="text-slate-500">Jumlah kemasan</p>
                <p className="font-medium text-slate-800">
                  {formatQty(row.purchase.packagesToBuy)}{" "}
                  {packagingLabel(row.packaging.packageType)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Estimasi tiba</p>
                <p className="font-medium text-slate-800">
                  {formatTanggalIndonesia(row.delivery.estimatedArrivalMax)}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600">{row.reasonText}</p>

            <details className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-slate-700">
                Detail lainnya
              </summary>
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="text-slate-500">Isi kemasan</dt>
                  <dd className="font-medium">
                    {formatQty(row.packaging.totalPackageContent)}{" "}
                    {baseUnitLabel(row.packaging.baseUnit)} / kemasan
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Harga per kemasan</dt>
                  <dd className="font-medium">
                    {formatRupiah(row.price.pricePerPackage)} (
                    {TAX_STATUS_LABELS[row.price.taxStatus as TaxStatus]})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    Harga per {baseUnitLabel(row.packaging.baseUnit)}
                  </dt>
                  <dd className="font-medium">
                    {formatRupiah(row.price.pricePerBaseUnitAfterTax)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Jumlah aktual diterima</dt>
                  <dd className="font-medium">
                    {formatQty(row.purchase.actualQuantityInBaseUnit)}{" "}
                    {baseUnitLabel(row.packaging.baseUnit)} (kelebihan{" "}
                    {formatQty(row.purchase.excessQuantityInBaseUnit)})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Minimum &amp; kelipatan pembelian</dt>
                  <dd className="font-medium">
                    Min {formatQty(row.packaging.minPurchasePackages)}, kelipatan{" "}
                    {formatQty(row.packaging.purchaseMultiplePackages)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ongkir</dt>
                  <dd className="font-medium">
                    {row.money.shippingFee === null
                      ? "Perlu konfirmasi"
                      : formatRupiah(row.money.shippingFee)}
                    {row.money.isFreeShipping ? " (Gratis Ongkir)" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Pembaruan harga &amp; stok</dt>
                  <dd className="font-medium">
                    Harga: {formatTanggalIndonesia(row.price.updatedAt)}
                    {row.stock.updatedAt
                      ? ` · Stok: ${formatTanggalIndonesia(row.stock.updatedAt)}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Estimasi kirim &amp; tiba</dt>
                  <dd className="font-medium">
                    Kirim {formatTanggalIndonesia(row.delivery.estimatedShipDate)} · Tiba{" "}
                    {formatTanggalIndonesia(row.delivery.estimatedArrivalMin)}–
                    {formatTanggalIndonesia(row.delivery.estimatedArrivalMax)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ketepatan waktu</dt>
                  <dd className="font-medium">{row.reliability.message}</dd>
                </div>
                {row.blockingReasons.length > 0 ? (
                  <div>
                    <dt className="text-red-600">Alasan tidak layak</dt>
                    <dd className="font-medium text-red-700">{row.blockingReasons.join(" ")}</dd>
                  </div>
                ) : null}
                {row.cautionNotes.length > 0 ? (
                  <div>
                    <dt className="text-amber-600">Perlu konfirmasi</dt>
                    <dd className="font-medium text-amber-700">{row.cautionNotes.join(" ")}</dd>
                  </div>
                ) : null}
              </dl>
            </details>

            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                variant={isSelected ? "primary" : "secondary"}
                onClick={() => onSelect(row.offerId)}
              >
                {isSelected ? "Terpilih" : "Pilih"}
              </Button>
              {whatsappUrl ? (
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
                >
                  WhatsApp
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  variant="secondary"
                  disabled
                  title="Nomor WhatsApp/HP belum tersedia"
                >
                  WhatsApp
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
