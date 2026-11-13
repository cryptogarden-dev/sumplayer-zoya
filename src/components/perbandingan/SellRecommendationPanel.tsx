"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatRupiah } from "@/lib/format/currency";
import {
  computeSellPricePerBaseUnit,
  computeSellRecommendation,
  computeSuggestedSellPrice,
} from "@/lib/domain/pricing/sell-recommendation";
import type { ComparisonRowDto } from "@/components/perbandingan/types";

const percentFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/**
 * Panel "Rekomendasi Harga Jual" di halaman Bandingkan (2026-11-13).
 * Duduk di kolom kanan, di bawah panel "PENAWARAN TERBAIK" — supaya saat
 * membandingkan harga beli, langsung terlihat harga jual dan untungnya.
 *
 * Hitungannya memakai penawaran terbaik (baris yang sama dengan panel di
 * atas): harga beli per satuan dasar + ongkir bila diketahui, dikali
 * jumlah yang benar-benar dibeli (actualQuantity — sudah dibulatkan ke
 * kemasan). Semua aritmetika uang lewat modul domain yang sama dengan
 * kartu rekomendasi di halaman detail produk.
 */
export function SellRecommendationPanel({
  productId,
  baseUnitLabel,
  sellPricePerBaseUnit,
  bestRow,
  onSellPriceApplied,
}: {
  productId: string;
  baseUnitLabel: string;
  sellPricePerBaseUnit: string | null;
  bestRow: ComparisonRowDto;
  onSellPriceApplied: () => void;
}) {
  const [targetPercentInput, setTargetPercentInput] = useState("20");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Harga beli per satuan dasar penawaran terbaik — sudah termasuk ongkir
  // bila ongkirnya diketahui, kalau tidak pakai harga sebelum ongkir
  // (pola yang sama dengan pengurutan baris di ComparisonView).
  const buyPerBaseUnit =
    bestRow.money.finalPricePerBaseUnit ?? bestRow.money.finalPricePerBaseUnitBeforeShipping;
  const includesShipping = bestRow.money.finalPricePerBaseUnit !== null;
  // Modal seluruh pembelian ini (ongkir termasuk bila diketahui).
  const totalCost = bestRow.money.totalCost ?? bestRow.money.totalCostBeforeShipping;
  const actualQuantity = Number(bestRow.purchase.actualQuantityInBaseUnit);

  /** Saran harga jual per satuan dasar dari target untung %. */
  const suggestion = useMemo(() => {
    if (targetPercentInput.trim() === "") {
      return { error: "Target untung belum diisi." };
    }
    try {
      // "Satu kemasan" di sini = seluruh pembelian ini: modal total dibagi
      // jumlah aktual = harga beli per satuan dasar.
      const suggested = computeSuggestedSellPrice({
        buyPricePerPackage: totalCost,
        contentsPerPackage: actualQuantity,
        targetMarginPercent: Number(targetPercentInput),
      });
      return { suggested };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Tidak bisa dihitung." };
    }
  }, [targetPercentInput, totalCost, actualQuantity]);

  /** Untung bila seluruh pembelian dari penawaran terbaik dijual habis. */
  const profit = useMemo(() => {
    if (sellPricePerBaseUnit === null) return null;
    try {
      return {
        result: computeSellRecommendation({
          buyPricePerPackage: totalCost,
          contentsPerPackage: actualQuantity,
          sellPricePerSellUnit: sellPricePerBaseUnit,
        }),
      };
    } catch {
      return null;
    }
  }, [sellPricePerBaseUnit, totalCost, actualQuantity]);

  async function handleApply() {
    if (!suggestion.suggested) return;
    setApplyError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const perBaseUnit = computeSellPricePerBaseUnit({
      sellPricePerSellUnit: suggestion.suggested.toNumber(),
      contentsPerPackage: 1,
      sellUnitLabel: baseUnitLabel,
      baseUnitLabel,
    });

    const response = await fetch(`/api/products/${productId}/sell-price`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellPricePerBaseUnit: perBaseUnit.toNumber() }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setApplyError("Gagal menyimpan harga jual. Coba lagi.");
      return;
    }

    setSuccessMessage(
      `Harga jual disetel ke ${formatRupiah(perBaseUnit.toNumber())}/${baseUnitLabel}.`,
    );
    onSellPriceApplied();
  }

  const profitNegative = profit?.result.profitPerPackage.isNegative() ?? false;

  return (
    <Card>
      <p className="text-kunyit text-xs font-semibold tracking-[2px]">REKOMENDASI HARGA JUAL</p>
      <p className="mt-2 text-sm text-slate-600">
        Harga jual sekarang:{" "}
        <span className="font-semibold text-slate-900">
          {sellPricePerBaseUnit === null
            ? "— (belum diatur)"
            : `${formatRupiah(Number(sellPricePerBaseUnit))}/${baseUnitLabel}`}
        </span>
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Penawaran terbaik ({bestRow.supplier.name}): beli{" "}
        <span className="font-semibold text-slate-900">
          {formatRupiah(Number(buyPerBaseUnit))}/{baseUnitLabel}
        </span>{" "}
        {includesShipping ? "(termasuk ongkir)" : "(belum termasuk ongkir)"}
      </p>

      {profit ? (
        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <p>
            Beli {bestRow.purchase.packagesToBuy} kemasan ({actualQuantity} {baseUnitLabel}) lalu
            jual semua:
          </p>
          <p>
            Omzet{" "}
            <span className="font-semibold text-slate-900">
              {formatRupiah(profit.result.revenuePerPackage.toNumber())}
            </span>{" "}
            − Modal{" "}
            <span className="font-semibold text-slate-900">{formatRupiah(Number(totalCost))}</span>
          </p>
          <p>
            Untung:{" "}
            <span
              className={
                profitNegative ? "font-semibold text-red-600" : "font-semibold text-emerald-600"
              }
            >
              {formatRupiah(profit.result.profitPerPackage.toNumber())}
              {profit.result.profitPercent !== null
                ? ` (${percentFormatter.format(profit.result.profitPercent.toNumber())}%)`
                : ""}
            </span>
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Atur harga jual di bawah supaya untung pembelian ini langsung terlihat.
        </p>
      )}

      <div className="mt-4">
        <Label htmlFor="compareTargetPercent">Saya mau untung (%)</Label>
        <Input
          id="compareTargetPercent"
          type="number"
          step="any"
          placeholder="Mis. 20"
          value={targetPercentInput}
          onChange={(event) => {
            setTargetPercentInput(event.target.value);
            setSuccessMessage(null);
          }}
        />
        {suggestion.error ? (
          <p className="mt-1 text-sm text-slate-500">{suggestion.error}</p>
        ) : suggestion.suggested ? (
          <p className="mt-1 text-sm text-slate-600">
            Saran harga jual:{" "}
            <span className="font-semibold text-slate-900">
              {formatRupiah(Math.round(suggestion.suggested.toNumber()))}/{baseUnitLabel}
            </span>
          </p>
        ) : null}
      </div>

      {applyError ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {applyError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-3 text-sm font-medium text-emerald-600">{successMessage}</p>
      ) : null}

      <Button
        type="button"
        className="mt-4"
        disabled={!suggestion.suggested || isSubmitting}
        onClick={handleApply}
      >
        {isSubmitting ? "Menyimpan..." : "Pakai sebagai Harga Jual"}
      </Button>
    </Card>
  );
}
