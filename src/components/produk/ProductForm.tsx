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

export type { ProductCategoryOption };

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
 * Form tambah produk (Tahap 3, langkah 4 — lihat `docs/TAHAP_3_UI_CHECKLIST.md`,
 * diperluas dengan foto opsional & kategori bisa dibuat langsung dari sini).
 * `baseUnit` TIDAK ditampilkan karena selalu diturunkan otomatis dari
 * `unitFamily` di server (mesin konversi Tahap 2).
 */
export function ProductForm({ categories }: { categories: ProductCategoryOption[] }) {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [variant, setVariant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [photoUrl, setPhotoUrl] = useState("");
  const [unitFamily, setUnitFamily] = useState<UnitFamily>("WEIGHT");
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        productName,
        brand: brand || undefined,
        variant: variant || undefined,
        categoryId: categoryId || undefined,
        photoUrl: photoUrl.trim() || undefined,
        unitFamily,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: ProductFieldErrors;
    } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(payload?.error ?? "Gagal menyimpan produk. Periksa kembali data yang diisi.");
      setFieldErrors(payload?.issues ?? {});
      return;
    }

    router.push("/produk");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          required
          placeholder="mis. BERAS-PREMIUM"
          value={sku}
          onChange={(event) => setSku(event.target.value)}
        />
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
      </Button>
    </form>
  );
}
