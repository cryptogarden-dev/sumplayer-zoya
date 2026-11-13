"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { SHIPPING_MODE_LABELS } from "@/lib/format/units";
import { SHIPPING_MODES } from "@/lib/domain/pricing/types";
import type { ShippingMode } from "@/lib/domain/pricing/types";

/**
 * Kelola aturan ongkir per supplier (R08, perbaikan #4). Backend-nya
 * (repository + API `PUT /api/suppliers/[id]/shipping-rule` + wiring ke
 * Bandingkan) sudah ada sejak Tahap 4 — yang belum ada hanya UI ini.
 * Satu supplier punya paling banyak satu aturan aktif; mode menentukan
 * field yang wajib diisi (sama seperti validasi Zod di server):
 * - GRATIS_MIN_PEMBELIAN: minimum pembelian + ongkir normal.
 * - TETAP: ongkir tetap.
 * - BERDASARKAN_AREA: daftar tarif per provinsi/kota (baris tanpa kota
 *   berlaku untuk seluruh provinsi itu).
 * Bila belum ada aturan (atau mode PERLU_KONFIRMASI), Bandingkan tetap
 * menampilkan harga produk dengan keterangan "belum termasuk ongkir" —
 * ongkir tidak pernah dipalsukan jadi 0.
 */

interface AreaDraft {
  province: string;
  city: string;
  fee: string;
}

interface ShippingRuleResponse {
  rule: {
    ruleType: ShippingMode;
    freeShippingMinAmount: string | number | null;
    flatFee: string | number | null;
    notes: string | null;
    areas: { province: string; city: string | null; fee: string | number }[];
  } | null;
}

const EMPTY_AREA: AreaDraft = { province: "", city: "", fee: "" };

export function ShippingRuleForm({ supplierId }: { supplierId: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [ruleType, setRuleType] = useState<ShippingMode>("PERLU_KONFIRMASI");
  const [flatFee, setFlatFee] = useState("");
  const [freeShippingMinAmount, setFreeShippingMinAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [areas, setAreas] = useState<AreaDraft[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/suppliers/${supplierId}/shipping-rule`);
        if (!response.ok) return;
        const payload = (await response.json()) as ShippingRuleResponse;
        if (cancelled || !payload.rule) return;
        setRuleType(payload.rule.ruleType);
        setFlatFee(payload.rule.flatFee === null ? "" : String(payload.rule.flatFee));
        setFreeShippingMinAmount(
          payload.rule.freeShippingMinAmount === null
            ? ""
            : String(payload.rule.freeShippingMinAmount),
        );
        setNotes(payload.rule.notes ?? "");
        setAreas(
          payload.rule.areas.map((area) => ({
            province: area.province,
            city: area.city ?? "",
            fee: String(area.fee),
          })),
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  function updateArea(index: number, patch: Partial<AreaDraft>) {
    setAreas((current) => current.map((area, i) => (i === index ? { ...area, ...patch } : area)));
  }

  function validate(): string | null {
    const feeNumber = (value: string) => Number(value);
    if (ruleType === "TETAP") {
      if (flatFee.trim() === "" || !Number.isFinite(feeNumber(flatFee)) || feeNumber(flatFee) < 0) {
        return "Nilai ongkir tetap wajib diisi (Rp, minimal 0).";
      }
    }
    if (ruleType === "GRATIS_MIN_PEMBELIAN") {
      if (
        freeShippingMinAmount.trim() === "" ||
        !Number.isFinite(feeNumber(freeShippingMinAmount)) ||
        feeNumber(freeShippingMinAmount) < 0
      ) {
        return "Minimum pembelian untuk gratis ongkir wajib diisi (Rp, minimal 0).";
      }
      if (flatFee.trim() === "" || !Number.isFinite(feeNumber(flatFee)) || feeNumber(flatFee) < 0) {
        return "Ongkir normal (jika syarat tidak terpenuhi) wajib diisi (Rp, minimal 0).";
      }
    }
    if (ruleType === "BERDASARKAN_AREA") {
      if (areas.length === 0) {
        return "Tambahkan minimal satu tarif area.";
      }
      for (const area of areas) {
        if (!area.province.trim()) return "Provinsi wajib diisi di setiap tarif area.";
        if (
          area.fee.trim() === "" ||
          !Number.isFinite(feeNumber(area.fee)) ||
          feeNumber(area.fee) < 0
        ) {
          return "Ongkir tiap area wajib diisi (Rp, minimal 0).";
        }
      }
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setIsSubmitting(true);
    const body: Record<string, unknown> = {
      ruleType,
      notes: notes.trim() === "" ? undefined : notes.trim(),
    };
    if (ruleType === "TETAP" || ruleType === "GRATIS_MIN_PEMBELIAN") {
      body.flatFee = Number(flatFee);
    }
    if (ruleType === "GRATIS_MIN_PEMBELIAN") {
      body.freeShippingMinAmount = Number(freeShippingMinAmount);
    }
    if (ruleType === "BERDASARKAN_AREA") {
      body.areas = areas.map((area) => ({
        province: area.province.trim(),
        city: area.city.trim() === "" ? undefined : area.city.trim(),
        fee: Number(area.fee),
      }));
    }

    const response = await fetch(`/api/suppliers/${supplierId}/shipping-rule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setFormError(payload?.error ?? "Gagal menyimpan aturan ongkir.");
      return;
    }
    setSuccessMessage("Aturan ongkir tersimpan. Bandingkan kini memakai tarif ini.");
  }

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Memuat aturan ongkir…</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold text-slate-900">Aturan Ongkir</h2>
      <p className="mb-4 text-sm text-slate-500">
        Satu aturan per supplier. Dipakai Bandingkan untuk menghitung total akhir; bila belum
        diatur, total tampil tanpa ongkir dengan keterangan &quot;belum termasuk ongkir&quot;.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="shippingRuleType">Mode ongkir</Label>
          <Select
            id="shippingRuleType"
            value={ruleType}
            onChange={(event) => setRuleType(event.target.value as ShippingMode)}
          >
            {SHIPPING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {SHIPPING_MODE_LABELS[mode]}
              </option>
            ))}
          </Select>
        </div>

        {ruleType === "GRATIS_MIN_PEMBELIAN" ? (
          <div>
            <Label htmlFor="freeShippingMinAmount">Minimum pembelian gratis ongkir (Rp)</Label>
            <Input
              id="freeShippingMinAmount"
              type="number"
              min="0"
              step="any"
              placeholder="Rp"
              value={freeShippingMinAmount}
              onChange={(event) => setFreeShippingMinAmount(event.target.value)}
              className="w-48"
            />
          </div>
        ) : null}

        {ruleType === "TETAP" || ruleType === "GRATIS_MIN_PEMBELIAN" ? (
          <div>
            <Label htmlFor="flatFee">
              {ruleType === "GRATIS_MIN_PEMBELIAN"
                ? "Ongkir normal bila syarat tidak terpenuhi (Rp)"
                : "Ongkir tetap (Rp)"}
            </Label>
            <Input
              id="flatFee"
              type="number"
              min="0"
              step="any"
              placeholder="Rp"
              value={flatFee}
              onChange={(event) => setFlatFee(event.target.value)}
              className="w-48"
            />
          </div>
        ) : null}

        {ruleType === "BERDASARKAN_AREA" ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Tarif per area</p>
            {areas.map((area, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <div>
                  <Label htmlFor={`area-province-${index}`}>Provinsi</Label>
                  <Input
                    id={`area-province-${index}`}
                    value={area.province}
                    onChange={(event) => updateArea(index, { province: event.target.value })}
                    placeholder="Jawa Barat"
                  />
                </div>
                <div>
                  <Label htmlFor={`area-city-${index}`}>Kota (opsional)</Label>
                  <Input
                    id={`area-city-${index}`}
                    value={area.city}
                    onChange={(event) => updateArea(index, { city: event.target.value })}
                    placeholder="Kosongkan = seluruh provinsi"
                  />
                </div>
                <div>
                  <Label htmlFor={`area-fee-${index}`}>Ongkir (Rp)</Label>
                  <Input
                    id={`area-fee-${index}`}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Rp"
                    value={area.fee}
                    onChange={(event) => updateArea(index, { fee: event.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setAreas((current) => current.filter((_, i) => i !== index))}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAreas((c) => [...c, { ...EMPTY_AREA }])}
            >
              Tambah Tarif Area
            </Button>
            <p className="text-xs text-slate-500">
              Baris dengan kota terisi hanya berlaku untuk kota itu; baris tanpa kota berlaku untuk
              seluruh provinsi. Bila tujuan tidak ada di daftar, ongkir kembali &quot;perlu
              konfirmasi&quot;.
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="shippingRuleNotes">Catatan (opsional)</Label>
          <Input
            id="shippingRuleNotes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Mis. ongkir luar Jawa Barat tanyakan dulu"
          />
        </div>

        {formError ? (
          <p role="alert" className="text-sm font-medium text-red-600">
            {formError}
          </p>
        ) : null}
        {successMessage ? (
          <p role="status" className="text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan Aturan Ongkir"}
        </Button>
      </form>
    </Card>
  );
}
