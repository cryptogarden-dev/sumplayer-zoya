import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Storage foto produk (permintaan pengguna 2026-08-20): memakai Supabase
 * Storage pada project yang SUDAH dipakai untuk database (lihat
 * `DATABASE_URL` - host `*.pooler.supabase.com`), jadi tidak perlu
 * menyiapkan penyedia storage baru. Memakai service role key (server-only,
 * TIDAK PERNAH dikirim ke browser) karena aplikasi ini memakai sesi
 * NextAuth-nya sendiri, bukan Supabase Auth - jadi kebijakan RLS berbasis
 * `auth.uid()` Supabase tidak relevan; kontrol akses (per business,
 * per role) tetap ditegakkan di route API kita sendiri sebelum memanggil
 * storage ini.
 */

export const PRODUCT_PHOTO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "product-photos";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseStorageClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur. Lihat README.md bagian foto produk.",
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

/**
 * Memastikan bucket foto produk ada (idempoten). Dipanggil sekali secara
 * lazy saat upload pertama, bukan setiap request, agar tidak menambah
 * roundtrip API tanpa perlu.
 */
let bucketEnsured = false;
export async function ensureProductPhotoBucket(): Promise<void> {
  if (bucketEnsured) return;
  const client = getSupabaseStorageClient();
  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === PRODUCT_PHOTO_BUCKET);
  if (!exists) {
    const { error } = await client.storage.createBucket(PRODUCT_PHOTO_BUCKET, {
      public: true,
      fileSizeLimit: "2MB",
    });
    // Diamkan error "already exists" (race antar request bersamaan).
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
  bucketEnsured = true;
}
