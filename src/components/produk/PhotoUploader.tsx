"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { NavIcon } from "@/components/app-shell/NavIcon";
import { compressImageFile, UnsupportedImageError } from "@/lib/media/compress-image";

interface PhotoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  error?: string;
}

/**
 * Upload foto produk dengan 2 cara - jepret langsung dari kamera HP, atau
 * pilih dari berkas/galeri (permintaan pengguna 2026-08-20) - keduanya
 * SELALU dikompres & diperkecil di browser sebelum dikirim (lihat
 * `compressImageFile`), lalu disimpan ke Supabase Storage lewat
 * `POST /api/products/photo`. Hasilnya URL publik disimpan ke `photoUrl`
 * (field yang sama seperti sebelumnya, tidak ada migrasi data).
 */
export function PhotoUploader({ value, onChange, error }: PhotoUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setUploadError(null);
    setIsUploading(true);
    try {
      const { blob, extension } = await compressImageFile(file);
      const formData = new FormData();
      formData.append("file", blob, `foto.${extension}`);

      const response = await fetch("/api/products/photo", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        setUploadError(payload?.error ?? "Gagal mengunggah foto. Coba lagi.");
        return;
      }
      onChange(payload.url);
    } catch (caught) {
      setUploadError(
        caught instanceof UnsupportedImageError
          ? caught.message
          : "Gagal memproses foto. Coba pilih foto lain.",
      );
    } finally {
      setIsUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      {/* `capture="environment"` membuka kamera belakang langsung di HP;
          tanpa atribut ini pada input kedua, browser menawarkan pemilihan
          dari galeri/berkas seperti biasa. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFileSelected(file);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFileSelected(file);
        }}
      />

      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau, bukan aset lokal Next.js
          <img
            src={value}
            alt="Pratinjau foto produk"
            className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
            Tanpa foto
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading}
              onClick={() => cameraInputRef.current?.click()}
            >
              <NavIcon name="camera" className="h-4 w-4" />
              Ambil Foto
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <NavIcon name="image" className="h-4 w-4" />
              Pilih Berkas
            </Button>
          </div>
          {isUploading ? (
            <p className="text-xs text-slate-500">Mengompres &amp; mengunggah...</p>
          ) : null}
          {value ? (
            <button
              type="button"
              className="self-start text-left text-xs font-medium text-red-600 hover:text-red-700"
              onClick={() => onChange("")}
              disabled={isUploading}
            >
              Hapus foto
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-1.5 text-xs text-slate-500">
        Foto otomatis dikecilkan &amp; dikompres di perangkat Anda sebelum diunggah - aman untuk
        ratusan produk.
      </p>
      {uploadError ? <p className="mt-1 text-xs text-red-600">{uploadError}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
