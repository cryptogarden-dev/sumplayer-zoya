import type { HTMLAttributes } from "react";
import clsx from "clsx";

/** Utilitas latar non-warna yang diawali `bg-` (posisi/ukuran/repeat) —
 * bukan warna, jadi tidak boleh mematikan `bg-white` bawaan kartu. */
const NON_COLOR_BG = new Set([
  "bg-cover",
  "bg-contain",
  "bg-center",
  "bg-top",
  "bg-bottom",
  "bg-left",
  "bg-right",
  "bg-fixed",
  "bg-local",
  "bg-scroll",
  "bg-repeat",
  "bg-no-repeat",
]);

function classTokens(className: string | undefined): string[] {
  return (className ?? "").split(/\s+/).filter(Boolean);
}

/** True bila pemanggil memberi warna latar sendiri (mis. `bg-slate`). */
function hasCustomBackground(className: string | undefined): boolean {
  return classTokens(className).some(
    (token) =>
      token.startsWith("bg-") &&
      !NON_COLOR_BG.has(token) &&
      !token.startsWith("bg-gradient") &&
      !token.startsWith("bg-linear") &&
      !token.startsWith("bg-clip-") &&
      !token.startsWith("bg-origin-"),
  );
}

/** True bila pemanggil memberi warna border sendiri (mis. `border-slate`).
 * Token sisi (`border-t`) dan lebar (`border-2`) tidak dihitung. */
function hasCustomBorderColor(className: string | undefined): boolean {
  return classTokens(className).some((token) => /^border-[a-z]{2,}/.test(token));
}

/**
 * Kartu putih standar. Bila pemanggil memberi warna latar/border sendiri,
 * warna bawaan TIDAK dipakai: di CSS hasil kompilasi Tailwind v4,
 * `bg-white`/`border-divider` terurut setelah sebagian warna lain, jadi
 * kalau keduanya menempel, warna bawaan yang menang dan warna pemanggil
 * tidak pernah terlihat (bug 2026-11-13: KPI "Area Terlayani" gelap di
 * halaman Supplier tampil putih polos, teks putih di atas latar putih).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[20px] border p-5",
        !hasCustomBackground(className) && "bg-white",
        !hasCustomBorderColor(className) && "border-divider",
        className,
      )}
      {...props}
    />
  );
}
