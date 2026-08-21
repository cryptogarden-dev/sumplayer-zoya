import type { BadgeTone } from "@/components/ui/Badge";

const PALETTE: BadgeTone[] = ["indigo", "emerald", "amber", "sky", "violet", "rose"];

/**
 * Memetakan id/nama kategori ke salah satu warna badge secara konsisten
 * (hash sederhana) - supaya kategori yang sama selalu tampil dengan warna
 * yang sama tanpa perlu menyimpan kolom warna terpisah di database.
 */
export function categoryTone(key: string): BadgeTone {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] ?? "slate";
}
