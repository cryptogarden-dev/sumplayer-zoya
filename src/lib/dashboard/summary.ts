export interface DashboardSummary {
  supplierCount: number;
  productCount: number;
  activeOrderCount: number;
  reminderCount: number;
}

/**
 * Ringkasan Beranda (poin 18 permintaan Tahap 1).
 *
 * Tahap 1 belum memiliki model supplier, produk, pesanan, maupun pengingat
 * (model tersebut baru ditambahkan pada Tahap 3-5, lihat
 * docs/IMPLEMENTATION_PLAN.md). Agar TIDAK menampilkan statistik palsu,
 * fungsi ini secara eksplisit mengembalikan nol untuk seluruh metrik.
 *
 * `businessId` sudah menjadi bagian dari signature fungsi ini sehingga saat
 * Tahap 3-5 selesai, pemanggil (Beranda) tidak perlu berubah - implementasi
 * di dalam fungsi ini tinggal diganti dengan query Prisma nyata yang
 * di-scope ke businessId (mengikuti pola scoping tenant di
 * docs/ARCHITECTURE.md §4).
 */
export async function getDashboardSummary(businessId: string): Promise<DashboardSummary> {
  void businessId;

  return {
    supplierCount: 0,
    productCount: 0,
    activeOrderCount: 0,
    reminderCount: 0,
  };
}
