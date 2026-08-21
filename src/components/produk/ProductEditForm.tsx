"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { UNIT_FAMILIES } from "@/lib/domain/units/types";
import type { UnitFamily } from "@/lib/domain/units/types";
import { UNIT_FAMILY_LABELS } from "@/lib/format/units";
import { CategoryPicker, type ProductCategoryOption } from "@/components/produk/CategoryPicker";
import { PhotoUploader } from "@/components/produk/PhotoUploader";

interface ProductFieldErrors {
  sku?: string[];
  productName?: string[];
  brand?: string[];
  variant?: string[];
  categoryId?: string[];
  photoUrl?: string[];
  unitFamily?: string[];
}

/**
 * Data produk yang dibutuhkan form ini. Field yang TIDAK ditampilkan di
 * UI (mis. `barcode`, `notes`) tetap disertakan apa adanya saat submit
 * agar tidak hilang/tertimpa kosong (pola sama seperti `SupplierEditForm`).
 */
export interface ProductEditFormData {
  id: string;
  sku: string;
  barcode: string | null;
  productName: string;
  brand: string | null;
  variant: string | null;
  categoryId: string | null;
  photoUrl: string | null;
  unitFamily: UnitFamily;
  notes: string | null;
}

export function ProductEditForm({
  product,
  categories,
}: {
  product: ProductEditFormData;
  categories: ProductCategoryOption[];
}) {
  const router = useRouter();
  const [sku, setSku] = useState(product.sku);
  const [productName, setProductName] = useState(product.productName);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [variant, setVariant] = useState(product.variant ?? "");
  const [categoryId, setCategoryId] = useState(product.categoryId ?? "");
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [photoUrl, setPhotoUrl] = useState(product.photoUrl ?? "");
  const [unitFamily, setUnitFamily] = useState<UnitFamily>(product.unitFamily);
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        productName,
        brand: brand || undefined,
        variant: variant || undefined,
        categoryId: categoryId || undefined,
        photoUrl: photoUrl.trim() || undefined,
        unitFamily,
        // TIDAK ditampilkan di form sederhana ini, tetapi dikirim apa
        // adanya (nilai lama) agar tidak tertimpa kosong saat menyimpan
        // (PATCH membutuhkan seluruh field, bukan partial).
        barcode: product.barcode ?? undefined,
        notes: product.notes ?? undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: ProductFieldErrors;
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

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" required value={sku} onChange={(event) => setSku(event.target.value)} />
        {fieldErrors.sku ? <p className="mt-1 text-xs text-red-600">{fieldErrors.sku[0]}</p> : null}
      </div>

      <div>
        <Label htmlFor="productName">Nama Produk</Label>
        <Input
          id="productName"
          required
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
        />
        {fieldErrors.productName ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.productName[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Merek</Label>
          <Input
            id="brand"
            placeholder="Opsional"
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          />
          {fieldErrors.brand ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.brand[0]}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="variant">Varian</Label>
          <Input
            id="variant"
            placeholder="Opsional"
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
          />
          {fieldErrors.variant ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.variant[0]}</p>
          ) : null}
        </div>
      </div>

      <CategoryPicker
        categories={categoryOptions}
        value={categoryId}
        onChange={setCategoryId}
        onCategoryCreated={(category) => setCategoryOptions((current) => [...current, category])}
        error={fieldErrors.categoryId?.[0]}
      />

      <div>
        <Label>Foto Produk (opsional)</Label>
        <PhotoUploader value={photoUrl} onChange={setPhotoUrl} error={fieldErrors.photoUrl?.[0]} />
      </div>

      <div>
        <Label htmlFor="unitFamily">Jenis Satuan Pembanding</Label>
        <Select
          id="unitFamily"
          required
          value={unitFamily}
          onChange={(event) => setUnitFamily(event.target.value as UnitFamily)}
        >
          {UNIT_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {UNIT_FAMILY_LABELS[family]}
            </option>
          ))}
        </Select>
        {fieldErrors.unitFamily ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.unitFamily[0]}</p>
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
