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
 * Data supplier yang dibutuhkan form ini. Field yang TIDAK ditampilkan di
 * UI (mis. `leadTimeDaysMin`, dst.) tetap disertakan `undefined`/apa
 * adanya saat submit agar tidak hilang/tertimpa kosong — lihat komentar
 * di `handleSubmit`.
 *
 * BUG TETAP (diperbaiki 2026-08-20): sebelumnya form ini hanya mengedit
 * `phoneNumber`, sementara `whatsappNumber` - field yang SEBENARNYA
 * dipakai untuk kirim pesanan lewat WhatsApp (lihat
 * `PesananWorkspace.tsx`/`whatsAppLinkForOrder`) - tidak pernah bisa
 * diedit dari sini. Akibatnya mengubah "No. HP/WhatsApp" di form tidak
 * berpengaruh sama sekali ke nomor yang benar-benar dipakai kalau
 * `whatsappNumber` sudah terisi lebih dulu (mis. lewat data awal/API).
 */
export interface SupplierEditFormData {
  id: string;
  supplierName: string;
  companyName: string | null;
  contactName: string | null;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  email: string | null;
  address: string;
  province: string;
  city: string;
  district: string | null;
  postalCode: string | null;
  operatingHours: string | null;
  leadTimeDaysMin: number;
  leadTimeDaysMax: number;
  paymentMethod: string | null;
  paymentTermDays: number | null;
  notes: string | null;
}

export function SupplierEditForm({ supplier }: { supplier: SupplierEditFormData }) {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState(supplier.supplierName);
  const [whatsappNumber, setWhatsappNumber] = useState(supplier.whatsappNumber ?? "");
  const [phoneNumber, setPhoneNumber] = useState(supplier.phoneNumber ?? "");
  const [address, setAddress] = useState(supplier.address);
  const [province, setProvince] = useState(supplier.province);
  const [city, setCity] = useState(supplier.city);
  const [leadTimeDaysMax, setLeadTimeDaysMax] = useState(String(supplier.leadTimeDaysMax));
  const [fieldErrors, setFieldErrors] = useState<SupplierFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch(`/api/suppliers/${supplier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName,
        whatsappNumber,
        phoneNumber,
        address,
        province,
        city,
        leadTimeDaysMax: Number(leadTimeDaysMax),
        // Field berikut TIDAK ditampilkan di form sederhana ini, tetapi
        // dikirim apa adanya (nilai lama) agar tidak hilang/tertimpa
        // kosong saat menyimpan (PATCH membutuhkan seluruh field, bukan
        // partial).
        companyName: supplier.companyName ?? undefined,
        contactName: supplier.contactName ?? undefined,
        email: supplier.email ?? undefined,
        district: supplier.district ?? undefined,
        postalCode: supplier.postalCode ?? undefined,
        operatingHours: supplier.operatingHours ?? undefined,
        leadTimeDaysMin: supplier.leadTimeDaysMin,
        paymentMethod: supplier.paymentMethod ?? undefined,
        paymentTermDays: supplier.paymentTermDays ?? undefined,
        notes: supplier.notes ?? undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: SupplierFieldErrors;
    } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(payload?.error ?? "Gagal menyimpan perubahan. Periksa kembali data yang diisi.");
      setFieldErrors(payload?.issues ?? {});
      return;
    }

    setSuccessMessage("Perubahan tersimpan.");
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
      {successMessage ? (
        <p className="text-sm font-medium text-emerald-600">{successMessage}</p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
