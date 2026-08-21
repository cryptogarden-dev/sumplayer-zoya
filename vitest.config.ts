import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    css: false,
    exclude: ["node_modules/**", ".next/**", "generated/**", "prisma/**"],
    // Beberapa test integrasi Tahap 3 menyentuh database dev lokal yang sama
    // (Prisma dev - wasm Postgres). Backend ini tidak menangani banyak
    // koneksi/statement bersamaan dengan baik, sehingga file test dijalankan
    // berurutan (bukan paralel) agar stabil.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "server-only": path.resolve(dirname, "./src/tests/server-only-mock.ts"),
      "@": path.resolve(dirname, "./src"),
      "@generated": path.resolve(dirname, "./generated"),
    },
  },
});
