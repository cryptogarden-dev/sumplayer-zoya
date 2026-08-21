import { PrismaClient } from "@generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Instance PrismaClient tunggal per proses (mencegah exhausting connection
 * pool saat hot-reload di Next.js dev server). Lihat docs/ARCHITECTURE.md §1.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diatur. Salin .env.example menjadi .env dan isi koneksi " +
        "database (lihat README.md bagian 'Menjalankan Proyek').",
    );
  }

  // Pool kecil & konservatif: cukup untuk beban UKM, dan menghindari
  // membanjiri koneksi ke database (penting terutama untuk database dev
  // lokal berbasis wasm yang kurang stabil menangani banyak koneksi
  // bersamaan). `onPoolError`/`onConnectionError` mencegah error koneksi
  // sesaat menjadi unhandled rejection yang mematikan proses.
  const adapter = new PrismaPg(
    { connectionString, max: 5, idleTimeoutMillis: 10_000 },
    {
      onPoolError: (error) => {
        console.error("[prisma] Pool error:", error.message);
      },
      onConnectionError: (error) => {
        console.error("[prisma] Connection error:", error.message);
      },
    },
  );
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
