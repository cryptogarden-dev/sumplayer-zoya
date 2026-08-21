"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface LocationFieldErrors {
  name?: string[];
  province?: string[];
  city?: string[];
  district?: string[];
  address?: string[];
}

/**
 * Form tambah lokasi/cabang (pengembangan lanjutan disepakati
 * 2026-08-18 - lihat docs/BACKLOG.md #1). Lokasi PERTAMA otomatis jadi
 * default di server (lihat `createBusinessLocation`), sehingga langsung
 * dipakai mengisi otomatis alamat tujuan di halaman Bandingkan &
 * Pesanan tanpa perlu diketik manual berulang.
 */
export function LocationForm({ hasExistingLocation }: { hasExistingLocation: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(hasExistingLocation ? "" : "Toko Pusat");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(!hasExistingLocation);
  const [fieldErrors, setFieldErrors] = useState<LocationFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch("/api/business-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, province, city, district, address, isDefault }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: LocationFieldErrors;
    } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(payload?.error ?? "Gagal menyimpan lokasi. Periksa kembali data yang diisi.");
      setFieldErrors(payload?.issues ?? {});
      return;
    }

    setName("");
    setProvince("");
    setCity("");
    setDistrict("");
    setAddress("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="loc-name">Nama Lokasi/Cabang</Label>
        <Input
          id="loc-name"
          required
          placeholder="mis. Toko Pusat, Cabang 1"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {fieldErrors.name ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="loc-province">Provinsi</Label>
          <Input
            id="loc-province"
            required
            value={province}
            onChange={(event) => setProvince(event.target.value)}
          />
          {fieldErrors.province ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.province[0]}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="loc-city">Kota/Kabupaten</Label>
          <Input
            id="loc-city"
            placeholder="Opsional"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          {fieldErrors.city ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.city[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="loc-district">Kecamatan</Label>
          <Input
            id="loc-district"
            placeholder="Opsional"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          />
          {fieldErrors.district ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.district[0]}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="loc-address">Alamat</Label>
          <Input
            id="loc-address"
            placeholder="Opsional"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          {fieldErrors.address ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.address[0]}</p>
          ) : null}
        </div>
      </div>

      {hasExistingLocation ? (
        <div className="flex items-center gap-2">
          <input
            id="loc-is-default"
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <Label htmlFor="loc-is-default" className="mb-0">
            Jadikan lokasi default (dipakai mengisi otomatis alamat tujuan)
          </Label>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Lokasi pertama ini otomatis dijadikan default dan dipakai mengisi otomatis alamat tujuan
          di halaman Bandingkan & Pesanan.
        </p>
      )}

      {formError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan Lokasi"}
      </Button>
    </form>
  );
}
