"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export interface ProductCategoryOption {
  id: string;
  name: string;
}

interface CategoryPickerProps {
  categories: ProductCategoryOption[];
  value: string;
  onChange: (categoryId: string) => void;
  onCategoryCreated: (category: ProductCategoryOption) => void;
  error?: string;
}

/**
 * Pilih kategori produk yang sudah ada, ATAU buat kategori baru langsung
 * dari form (tanpa pindah halaman) - memakai `POST /api/product-categories`
 * yang sudah ada. Kategori baru langsung terpilih setelah tersimpan.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  onCategoryCreated,
  error,
}: CategoryPickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsSaving(true);
    setCreateError(null);

    const response = await fetch("/api/product-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const payload = (await response.json().catch(() => null)) as {
      category?: ProductCategoryOption;
      error?: string;
    } | null;

    setIsSaving(false);

    if (!response.ok || !payload?.category) {
      setCreateError(payload?.error ?? "Gagal membuat kategori baru.");
      return;
    }

    onCategoryCreated(payload.category);
    onChange(payload.category.id);
    setNewName("");
    setIsAdding(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor="categoryId">Kategori</Label>
        <button
          type="button"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          onClick={() => {
            setCreateError(null);
            setIsAdding((current) => !current);
          }}
        >
          {isAdding ? "Batal" : "+ Kategori baru"}
        </button>
      </div>

      {isAdding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="mis. Sembako"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button
            type="button"
            className="shrink-0"
            onClick={handleCreate}
            disabled={isSaving || !newName.trim()}
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      ) : (
        <Select id="categoryId" value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Tanpa kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      )}
      {createError ? <p className="mt-1 text-xs text-red-600">{createError}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
