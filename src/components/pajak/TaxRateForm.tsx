"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface TaxRateFieldErrors {
  name?: string[];
  ratePercent?: string[];
}

/**
 * Form tambah tarif pajak (Tahap 3, langkah 7 - opsional - lihat
 * `docs/TAHAP_3_UI_CHECKLIST.md`). Khusus Pemilik/Admin (R07, R26),
 * halaman ini dijaga lewat `requireRole(ONLY_OWNER_ADMIN)` di
 * `page.tsx`, bukan lewat menu navigasi utama (R25 membatasi menu utama
 * hanya 4 item).
 */
export function TaxRateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ratePercent, setRatePercent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TaxRateFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch("/api/tax-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ratePercent: Number(ratePercent),
        isDefault,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: TaxRateFieldErrors;
    } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(
        payload?.error ?? "Gagal menyimpan tarif pajak. Periksa kembali data yang diisi.",
      );
      setFieldErrors(payload?.issues ?? {});
      return;
    }

    setName("");
    setRatePercent("");
    setIsDefault(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md space-y-4">
      <div>
        <Label htmlFor="tax-name">Nama Tarif</Label>
        <Input
          id="tax-name"
          required
          placeholder="mis. PPN 11%"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {fieldErrors.name ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="tax-rate">Tarif (%)</Label>
        <Input
          id="tax-rate"
          type="number"
          min="0"
          max="100"
          step="any"
          required
          value={ratePercent}
          onChange={(event) => setRatePercent(event.target.value)}
        />
        {fieldErrors.ratePercent ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.ratePercent[0]}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="tax-is-default"
          type="checkbox"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <Label htmlFor="tax-is-default" className="mb-0">
          Jadikan tarif default
        </Label>
      </div>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan Tarif Pajak"}
      </Button>
    </form>
  );
}
