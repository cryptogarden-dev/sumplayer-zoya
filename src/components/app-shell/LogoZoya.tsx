/**
 * Logo Zoya sebagai SVG inline — file `assets/logo-zoya.png` yang disebut
 * di docs/design/DESIGN_SPEC.md tidak ada di paket handoff (dan tautan
 * Moda butuh login), jadi monogram dibuat ulang sesuai spec: huruf "Z"
 * slate di atas latar nav-active, dengan daun kecil kunyit di sudut kanan
 * atas. Inline SVG = tanpa request gambar tambahan, paling cepat.
 * Sub-label brand: "GROSIR SEMBAKO" (toko ini grosir sembako/toserba —
 * spec menulis "TOKO BUMBU", bisa diubah satu baris bila diminta).
 */
export function LogoZoya({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      role="img"
      aria-label="Logo Zoya"
      className="shrink-0"
    >
      <rect width="44" height="44" rx="12" fill="#E6EDF2" />
      <text
        x="21"
        y="31"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="600"
        fontSize="26"
        fill="#2E4558"
      >
        Z
      </text>
      <path d="M31 4.5c5 0 8.5 3.5 8.5 8.5-5 0-8.5-3.5-8.5-8.5Z" fill="#C9774F" />
    </svg>
  );
}
