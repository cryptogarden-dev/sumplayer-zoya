import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ApiError, handleApiError, requireApiRole } from "@/lib/server/api-auth";
import { OWNER_ADMIN_AND_STAFF } from "@/lib/auth/rbac";
import {
  PRODUCT_PHOTO_BUCKET,
  ensureProductPhotoBucket,
  getSupabaseStorageClient,
} from "@/lib/storage/supabase";

/**
 * Upload foto produk (permintaan pengguna 2026-08-20). File yang diterima
 * di sini SEHARUSNYA sudah dikompres/diresize di sisi klien (lihat
 * `PhotoUploader.tsx`), tapi validasi ukuran & tipe di server tetap wajib
 * (Keamanan: "jangan percaya input dari client") - klien yang tidak
 * mengompres (mis. API lain di masa depan) tidak boleh bisa membanjiri
 * storage dengan file besar.
 */
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB - jauh di atas hasil kompresi normal (~50-200KB)
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(OWNER_ADMIN_AND_STAFF);

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file || !(file instanceof File)) {
      throw new ApiError(400, "Berkas foto tidak ditemukan pada permintaan.");
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new ApiError(400, "Format foto harus WebP, JPEG, atau PNG.");
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError(400, "Ukuran foto maksimal 2MB. Coba pilih foto lain.");
    }

    await ensureProductPhotoBucket();
    const client = getSupabaseStorageClient();

    const extension =
      file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
    const objectPath = `${session.user.businessId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(PRODUCT_PHOTO_BUCKET)
      .upload(objectPath, await file.arrayBuffer(), {
        contentType: file.type,
        cacheControl: "31536000", // 1 tahun - nama file acak sekali pakai, aman di-cache lama
        upsert: false,
      });

    if (uploadError) {
      throw new ApiError(502, `Gagal mengunggah foto ke storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = client.storage
      .from(PRODUCT_PHOTO_BUCKET)
      .getPublicUrl(objectPath);

    return NextResponse.json({ url: publicUrlData.publicUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
