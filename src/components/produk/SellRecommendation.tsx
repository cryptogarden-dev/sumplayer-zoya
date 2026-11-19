"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { formatRupiah } from "@/lib/format/currency";
import {
  computeSellPricePerBaseUnit,
  computeSellRecommendation,
  computeSuggestedSellPrice,
} from "@/lib/domain/pricing/sell-recommendation";

/**
 * Penawaran aktif yang bisa dipakai sebagai dasar rekomendasi. Harga per
 * kemasan sudah SETELAH pajak (dihitung halaman server lewat
 * `calculateSubtotal`, sama seperti margin) supaya untung yang ditampilkan
 * konsisten dengan kartu margin di atas.
 */
export interface SellRecommendationOffer {
  id: string;
  supplierName: string;
  /** Mis. "Dus · 1 x 1 pcs = 1 pcs". */
  packageLabel: string;
  pricePerPackageAfterTax: string;
  totalPackageContent: string;
}

const percentFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/**
 * Label satuan kemasan dari isi kemasan dalam satuan dasar — mis. 0,25 kg
 * → "250 gram", 1 kg → "kg", 5 kg → "5 kg". Dipakai supaya bawaan kartu
 * ini "jual per kemasan" (bukan "jual per kg" yang diisi 0,25 — itu yang
 * membingungkan: 0,25 di kolom isi + satuan kg dibaca sebagai 0,25
 * satuan jual per kemasan).
 */
function packageUnitLabel(totalPackageContent: string, baseUnitLabel: string): string {
  if (baseUnitLabel !== "kg") return baseUnitLabel;
  const pkgKg = Number(totalPackageContent);
  if (!Number.isFinite(pkgKg) || pkgKg <= 0) return baseUnitLabel;
  if (pkgKg === 1) return "kg";
  if (pkgKg < 1) return `${Math.round(pkgKg * 1000)} gram`;
  return `${pkgKg} kg`;
}

/**
 * Kartu "Rekomendasi Harga Jual" (2026-11-13).
 *
 * Alur: pilih penawaran beli → ketik isi per kemasan dan satuan jualnya
 * (mis. Teh Gelas: 24 cup per dus) → pilih mode hitung: ketik harga jual
 * per satuan dan lihat untungnya, ATAU ketik target untung % dan lihat
 * saran harga jualnya → tombol "Pakai sebagai Harga Jual" menyimpan
 * harga jual produk (per satuan dasar). Untuk produk timbangan ada
 * pilihan cepat "Jual per" (250 gram, 500 gram, ...) yang mengisi isi +
 * satuan sekaligus — harga yang sudah diketik ikut menyesuaikan supaya
 * harga per kg tetap sama, jadi tidak perlu hitung ulang dari awal.
 */
export function SellRecommendation({
  productId,
  baseUnitLabel,
  offers,
}: {
  productId: string;
  baseUnitLabel: string;
  offers: SellRecommendationOffer[];
}) {
  const router = useRouter();
  const [selectedOfferId, setSelectedOfferId] = useState(offers[0]?.id ?? "");
  // Bawaan: jual per kemasan utuh (isi 1, satuan = kemasan) — mis. Terigu
  // langsung "1 × 250 gram", bukan "0,25 × kg".
  const [contents, setContents] = useState("1");
  const [sellUnitLabel, setSellUnitLabel] = useState(() =>
    packageUnitLabel(offers[0]?.totalPackageContent ?? "", baseUnitLabel),
  );
  const [mode, setMode] = useState<"price" | "percent">("price");
  const [sellPriceInput, setSellPriceInput] = useState("");
  const [targetPercentInput, setTargetPercentInput] = useState("20");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId) ?? offers[0];

  function handleOfferChange(offerId: string) {
    const offer = offers.find((item) => item.id === offerId);
    setSelectedOfferId(offerId);
    // Isi dan satuan kembali ke bawaan penawaran yang dipilih (jual per kemasan).
    setContents("1");
    setSellUnitLabel(packageUnitLabel(offer?.totalPackageContent ?? "", baseUnitLabel));
    setSuccessMessage(null);
    setApplyError(null);
  }

  /**
   * Pilihan cepat "Jual per" untuk produk timbangan (kg): per kemasan,
   * 100/250/500 gram, 1 kg — hanya yang membagi kemasan jadi bungkus
   * utuh (mis. kemasan 1 kg → 250 gram = isi 4; kemasan 250 gram cuma
   * punya "Per kemasan"). Harga yang sudah diketik ikut menyesuaikan
   * supaya harga per kg tetap sama.
   */
  const splitOptions = useMemo(() => {
    if (!selectedOffer || baseUnitLabel !== "kg") return [];
    const pkgKg = Number(selectedOffer.totalPackageContent);
    if (!Number.isFinite(pkgKg) || pkgKg <= 0) return [];
    const options: { key: string; label: string; contents: number; unit: string }[] = [
      {
        key: "package",
        label: "Per kemasan",
        contents: 1,
        unit: packageUnitLabel(selectedOffer.totalPackageContent, baseUnitLabel),
      },
    ];
    for (const grams of [100, 250, 500, 1000]) {
      const contents = pkgKg / (grams / 1000);
      if (Number.isInteger(contents) && contents >= 1) {
        options.push({
          key: `${grams}g`,
          label: grams >= 1000 ? "1 kg" : `${grams} gram`,
          contents,
          unit: grams >= 1000 ? "kg" : `${grams} gram`,
        });
      }
    }
    // "Per kemasan" bisa sama persis dengan salah satu gram (mis. kemasan
    // 1 kg = "1 kg", kemasan 250 gram = "250 gram") — tampilkan sekali saja.
    return options.filter(
      (option, index) =>
        options.findIndex(
          (other) => other.contents === option.contents && other.unit === option.unit,
        ) === index,
    );
  }, [selectedOffer, baseUnitLabel]);

  const activeSplitKey =
    splitOptions.find(
      (option) =>
        Number(contents) === option.contents &&
        sellUnitLabel.trim().toLowerCase() === option.unit.toLowerCase(),
    )?.key ?? null;

  function applySellSplit(nextContents: number, nextUnit: string) {
    const oldContents = Number(contents);
    const oldPrice = Number(sellPriceInput);
    if (
      sellPriceInput.trim() !== "" &&
      Number.isFinite(oldPrice) &&
      Number.isFinite(oldContents) &&
      oldContents > 0 &&
      nextContents > 0
    ) {
      // Harga per satuan jual ikut menyesuaikan supaya harga per kg tetap sama.
      setSellPriceInput(String(Math.round((oldPrice * oldContents) / nextContents)));
    }
    setContents(String(nextContents));
    setSellUnitLabel(nextUnit);
    setSuccessMessage(null);
    setApplyError(null);
  }

  /** Harga jual per satuan jual + hasil hitungnya, atau alasan belum bisa dihitung. */
  const calculation = useMemo(() => {
    if (!selectedOffer) {
      return { error: "Belum ada penawaran harga beli." };
    }
    const contentsNum = Number(contents);
    if (contents.trim() === "" || !Number.isFinite(contentsNum)) {
      return { error: "Isi per kemasan belum diisi." };
    }
    if (contentsNum <= 0) {
      return { error: "Isi per kemasan harus lebih dari 0." };
    }
    if (sellUnitLabel.trim() === "") {
      return { error: "Satuan jual belum diisi." };
    }
    try {
      if (mode === "percent" && targetPercentInput.trim() === "") {
        return { error: "Target untung belum diisi." };
      }
      const sellPerUnit =
        mode === "price"
          ? Number(sellPriceInput)
          : computeSuggestedSellPrice({
              buyPricePerPackage: selectedOffer.pricePerPackageAfterTax,
              contentsPerPackage: contentsNum,
              targetMarginPercent: Number(targetPercentInput),
            }).toNumber();
      if (mode === "price" && (sellPriceInput.trim() === "" || !Number.isFinite(sellPerUnit))) {
        return { error: "Harga jual per satuan belum diisi." };
      }
      const result = computeSellRecommendation({
        buyPricePerPackage: selectedOffer.pricePerPackageAfterTax,
        contentsPerPackage: contentsNum,
        sellPricePerSellUnit: sellPerUnit,
      });
      const perBaseUnit = computeSellPricePerBaseUnit({
        sellPricePerSellUnit: sellPerUnit,
        contentsPerPackage: contentsNum,
        sellUnitLabel,
        baseUnitLabel,
        totalPackageContent: selectedOffer.totalPackageContent,
      });
      return { result, sellPerUnit, perBaseUnit };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Tidak bisa dihitung." };
    }
  }, [
    selectedOffer,
    contents,
    sellUnitLabel,
    mode,
    sellPriceInput,
    targetPercentInput,
    baseUnitLabel,
  ]);

  /** Pindah mode sambil membawa nilai yang sedang tampil. */
  function switchMode(nextMode: "price" | "percent") {
    if (nextMode === "price" && calculation.sellPerUnit !== undefined) {
      setSellPriceInput(String(Math.round(calculation.sellPerUnit)));
    }
    if (nextMode === "percent" && calculation.result?.profitPercent != null) {
      setTargetPercentInput(String(Math.round(calculation.result.profitPercent.toNumber())));
    }
    setMode(nextMode);
    setSuccessMessage(null);
    setApplyError(null);
  }

  async function handleApply() {
    if (!calculation.perBaseUnit) {
      return;
    }
    setApplyError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/products/${productId}/sell-price`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellPricePerBaseUnit: calculation.perBaseUnit.toNumber() }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setApplyError("Gagal menyimpan harga jual. Coba lagi.");
      return;
    }

    setSuccessMessage(
      `Harga jual disetel ke ${formatRupiah(calculation.perBaseUnit.toNumber())}/${baseUnitLabel}.`,
    );
    router.refresh();
  }

  if (offers.length === 0 || !selectedOffer) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-slate-900">Rekomendasi Harga Jual</h2>
        <p className="mt-1 text-sm text-slate-500">
          Belum ada penawaran harga beli — tambahkan penawaran dulu supaya rekomendasi bisa
          dihitung.
        </p>
      </Card>
    );
  }

  const result = calculation.result;
  const profitNegative = result?.profitPerPackage.isNegative() ?? false;
  const sameUnit = sellUnitLabel.trim().toLowerCase() === baseUnitLabel.trim().toLowerCase();

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-900">Rekomendasi Harga Jual</h2>
      <p className="mt-1 text-sm text-slate-500">
        Beli per kemasan, jual per isi kemasan — hitung untungnya dulu, lalu pakai harganya.
      </p>

      <div className="mt-4 space-y-4">
        {offers.length > 1 ? (
          <div>
            <Label htmlFor="sellRecommendationOffer">Harga beli dari</Label>
            <Select
              id="sellRecommendationOffer"
              value={selectedOfferId}
              onChange={(event) => handleOfferChange(event.target.value)}
            >
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.supplierName} — {formatRupiah(Number(offer.pricePerPackageAfterTax))} /{" "}
                  {offer.packageLabel}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Harga beli dari{" "}
            <span className="font-semibold text-slate-900">{selectedOffer.supplierName}</span>:{" "}
            <span className="font-semibold text-slate-900">
              {formatRupiah(Number(selectedOffer.pricePerPackageAfterTax))}
            </span>{" "}
            / {selectedOffer.packageLabel}
          </p>
        )}

        {splitOptions.length > 0 ? (
          <div>
            <Label>Jual per</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {splitOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => applySellSplit(option.contents, option.unit)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeSplitKey === option.key
                      ? "border-slate bg-slate text-white"
                      : "border-divider text-slate hover:border-cloud bg-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Pilih bungkus jualnya — isi dan harga ikut menyesuaikan, tidak perlu hitung ulang.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sellRecommendationContents">Isi per kemasan</Label>
            <Input
              id="sellRecommendationContents"
              type="number"
              min="0"
              step="any"
              value={contents}
              onChange={(event) => {
                setContents(event.target.value);
                setSuccessMessage(null);
              }}
            />
            <p className="mt-1 text-xs text-slate-400">
              Jumlah bungkus jual dalam 1 kemasan beli (mis. 1 kg jadi 4 bungkus 250 gram → isi 4).
            </p>
          </div>
          <div>
            <Label htmlFor="sellRecommendationUnit">Satuan jual</Label>
            <Input
              id="sellRecommendationUnit"
              value={sellUnitLabel}
              onChange={(event) => {
                setSellUnitLabel(event.target.value);
                setSuccessMessage(null);
              }}
            />
            <p className="mt-1 text-xs text-slate-400">
              Satuan saat dijual eceran (mis. cup). Samakan dengan &ldquo;{baseUnitLabel}&rdquo;
              bila dijual per {baseUnitLabel}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="sellRecommendationMode"
              checked={mode === "price"}
              onChange={() => switchMode("price")}
            />
            Saya mau jual Rp
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="sellRecommendationMode"
              checked={mode === "percent"}
              onChange={() => switchMode("percent")}
            />
            Saya mau untung %
          </label>
        </div>

        {mode === "price" ? (
          <div>
            <Label htmlFor="sellRecommendationPrice">
              Harga jual (per {sellUnitLabel.trim() || "satuan"})
            </Label>
            <Input
              id="sellRecommendationPrice"
              type="number"
              min="0"
              step="any"
              placeholder="Mis. 1000"
              value={sellPriceInput}
              onChange={(event) => {
                setSellPriceInput(event.target.value);
                setSuccessMessage(null);
              }}
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="sellRecommendationPercent">Target untung (%)</Label>
            <Input
              id="sellRecommendationPercent"
              type="number"
              step="any"
              placeholder="Mis. 20"
              value={targetPercentInput}
              onChange={(event) => {
                setTargetPercentInput(event.target.value);
                setSuccessMessage(null);
              }}
            />
            {calculation.sellPerUnit !== undefined ? (
              <p className="mt-1 text-xs text-slate-400">
                Saran harga jual: {formatRupiah(Math.round(calculation.sellPerUnit))}/
                {sellUnitLabel.trim() || "satuan"}
              </p>
            ) : null}
          </div>
        )}

        {calculation.error ? (
          <p className="text-sm text-slate-500">{calculation.error}</p>
        ) : result && calculation.perBaseUnit ? (
          <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <p>
              Harga beli per {sellUnitLabel.trim() || "satuan"}:{" "}
              <span className="font-semibold text-slate-900">
                {formatRupiah(result.buyPricePerSellUnit.toNumber())}
              </span>
            </p>
            <p>
              Omzet per kemasan:{" "}
              <span className="font-semibold text-slate-900">
                {formatRupiah(result.revenuePerPackage.toNumber())}
              </span>
            </p>
            <p>
              Untung per kemasan:{" "}
              <span
                className={
                  profitNegative ? "font-semibold text-red-600" : "font-semibold text-emerald-600"
                }
              >
                {formatRupiah(result.profitPerPackage.toNumber())}
                {result.profitPercent !== null
                  ? ` (${percentFormatter.format(result.profitPercent.toNumber())}%)`
                  : ""}
              </span>
            </p>
            <p>
              Untung per {sellUnitLabel.trim() || "satuan"}:{" "}
              <span
                className={
                  profitNegative ? "font-semibold text-red-600" : "font-semibold text-emerald-600"
                }
              >
                {formatRupiah(result.profitPerSellUnit.toNumber())}
              </span>
            </p>
          </div>
        ) : null}

        {calculation.perBaseUnit ? (
          <p className="text-sm text-slate-600">
            Harga jual produk akan disetel ke{" "}
            <span className="font-semibold text-slate-900">
              {formatRupiah(calculation.perBaseUnit.toNumber())}/{baseUnitLabel}
            </span>
            {sameUnit ? null : (
              <>
                {" "}
                (dari {formatRupiah(calculation.sellPerUnit ?? 0)}/{sellUnitLabel.trim()})
              </>
            )}
            .
          </p>
        ) : null}

        {applyError ? (
          <p role="alert" className="text-sm font-medium text-red-600">
            {applyError}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-sm font-medium text-emerald-600">{successMessage}</p>
        ) : null}

        <Button
          type="button"
          disabled={!calculation.perBaseUnit || isSubmitting}
          onClick={handleApply}
        >
          {isSubmitting ? "Menyimpan..." : "Pakai sebagai Harga Jual"}
        </Button>
      </div>
    </Card>
  );
}
