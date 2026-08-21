/**
 * Kompresi & resize foto di sisi BROWSER sebelum diunggah (permintaan
 * pengguna 2026-08-20: "kompres otomatis biar mau nyimpan ratusan produk
 * fotonya juga aman"). Dilakukan di klien (bukan server) supaya file yang
 * benar-benar dikirim ke server & disimpan di storage sudah kecil dari
 * awal - menghemat bandwidth upload SEKALIGUS kuota storage.
 *
 * Strategi: resize agar sisi terpanjang maksimal `maxDimension`, lalu
 * ekspor sebagai WebP (fallback JPEG bila WebP tidak didukung browser).
 * Kualitas diturunkan bertahap jika hasil masih di atas target ukuran,
 * sampai batas percobaan - cukup untuk foto produk toko (bukan foto
 * profesional beresolusi tinggi).
 */

const MAX_DIMENSION = 1024;
const TARGET_MAX_BYTES = 350 * 1024; // ~350KB
const QUALITY_STEPS = [0.82, 0.65, 0.5, 0.35];

export class UnsupportedImageError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UnsupportedImageError("Berkas bukan gambar yang valid atau rusak."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export interface CompressedImage {
  blob: Blob;
  extension: "webp" | "jpg";
}

/** Mengompres gambar apa pun menjadi WebP/JPEG kecil, cocok untuk ratusan foto produk. */
export async function compressImageFile(file: File): Promise<CompressedImage> {
  const image = await loadImage(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new UnsupportedImageError("Browser tidak mendukung pemrosesan gambar (canvas).");
  }
  context.drawImage(image, 0, 0, width, height);

  // Cek dukungan WebP (Safari lama tidak mendukung toBlob('image/webp')).
  const webpProbe = await canvasToBlob(canvas, "image/webp", 0.92);
  const mimeType = webpProbe ? "image/webp" : "image/jpeg";
  const extension: CompressedImage["extension"] = webpProbe ? "webp" : "jpg";

  let bestBlob = webpProbe;
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, mimeType, quality);
    if (blob) bestBlob = blob;
    if (blob && blob.size <= TARGET_MAX_BYTES) break;
  }

  if (!bestBlob) {
    throw new UnsupportedImageError("Gagal mengompres gambar. Coba foto lain.");
  }

  return { blob: bestBlob, extension };
}
