"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface SupplierFieldErrors {
  supplierName?: string[];
  phoneNumber?: string[];
  whatsappNumber?: string[];
  address?: string[];
  province?: string[];
  city?: string[];
  leadTimeDaysMax?: string[];
}

/**
 * Form tambah supplier (Tahap 3, langkah 2 — lihat
 * `docs/TAHAP_3_UI_CHECKLIST.md`, diperbaiki 2026-08-20: sebelumnya cuma
 * ada field `phoneNumber`, padahal fitur kirim pesanan otomatis
 * (`PesananWorkspace.tsx`) memakai `whatsappNumber` lebih dulu - lihat
 * komentar sama di `SupplierEditForm.tsx`). Field lain (kontak tambahan,
 * area, jadwal, aturan ongkir) menyusul di halaman detail/edit.
 */
export function SupplierForm() {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [leadTimeDaysMax, setLeadTimeDaysMax] = useState("2");
  const [fieldErrors, setFieldErrors] = useState<SupplierFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName,
        whatsappNumber,
        phoneNumber,
        address,
        province,
        city,
        leadTimeDaysMax: Number(leadTimeDaysMax),
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: SupplierFieldErrors;
    } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(payload?.error ?? "Gagal menyimpan supplier. Periksa kembali data yang diisi.");
      setFieldErrors(payload?.issues ?? {});
      return;
    }

    router.push("/supplier");
    router.refresh();
  }

  const contactError = fieldErrors.whatsappNumber?.[0] ?? fieldErrors.phoneNumber?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="supplierName">Nama Supplier</Label>
        <Input
          id="supplierName"
          required
          value={supplierName}
          onChange={(event) => setSupplierName(event.target.value)}
        />
        {fieldErrors.supplierName ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.supplierName[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="whatsappNumber">No. WhatsApp</Label>
          <Input
            id="whatsappNumber"
            placeholder="081234567890"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="phoneNumber">No. HP (opsional, jika berbeda)</Label>
          <Input
            id="phoneNumber"
            placeholder="Opsional"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Nomor WhatsApp dipakai untuk mengirim pesanan otomatis - wajib isi salah satu (WhatsApp atau
        HP).
      </p>
      {contactError ? <p className="text-xs text-red-600">{contactError}</p> : null}

      <div>
        <Label htmlFor="address">Alamat</Label>
        <Input
          id="address"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        {fieldErrors.address ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.address[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="province">Provinsi</Label>
          <Input
            id="province"
            required
            value={province}
            onChange={(event) => setProvince(event.target.value)}
          />
          {fieldErrors.province ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.province[0]}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="city">Kota/Kabupaten</Label>
          <Input
            id="city"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          {fieldErrors.city ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.city[0]}</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="leadTimeDaysMax">Estimasi Lama Pengiriman (hari)</Label>
        <Input
          id="leadTimeDaysMax"
          type="number"
          min="0"
          required
          value={leadTimeDaysMax}
          onChange={(event) => setLeadTimeDaysMax(event.target.value)}
        />
        {fieldErrors.leadTimeDaysMax ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.leadTimeDaysMax[0]}</p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan Supplier"}
      </Button>
    </form>
  );
}
