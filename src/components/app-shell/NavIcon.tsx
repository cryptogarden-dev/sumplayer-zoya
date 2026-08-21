import type { SVGProps } from "react";

export type IconName =
  | "truck"
  | "package"
  | "scale"
  | "clipboardList"
  | "chevronDown"
  | "logOut"
  | "inbox"
  | "alertTriangle"
  | "receipt"
  | "mapPin"
  | "camera"
  | "image"
  | "arrowLeft"
  | "shoppingCart";

interface NavIconProps extends Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill"> {
  name: IconName;
}

/**
 * Ikon inline sederhana (tanpa dependensi library ikon eksternal) agar
 * bundel tetap ringan pada Tahap 1. Bersifat dekoratif (aria-hidden).
 */
export function NavIcon({ name, ...props }: NavIconProps) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "truck":
      return (
        <svg {...common}>
          <rect x="2" y="7" width="12" height="9" rx="1" />
          <path d="M14 10h4l3 3v3h-7" />
          <circle cx="6.5" cy="18.5" r="1.5" />
          <circle cx="17.5" cy="18.5" r="1.5" />
        </svg>
      );
    case "package":
      return (
        <svg {...common}>
          <path d="M3.5 8.5 12 4l8.5 4.5V16L12 20l-8.5-4.5Z" />
          <path d="M3.5 8.5 12 12l8.5-4.5" />
          <path d="M12 12v8" />
        </svg>
      );
    case "scale":
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 8h14" />
          <path d="M5 8 2.5 13a2.5 2.5 0 0 0 5 0Z" />
          <path d="M19 8l-2.5 5a2.5 2.5 0 0 0 5 0Z" />
          <path d="M9 21h6" />
        </svg>
      );
    case "clipboardList":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <rect x="9" y="2" width="6" height="4" rx="1" />
          <path d="M8 11h8M8 15h8M8 19h5" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "logOut":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M3 12h4l2 3h6l2-3h4" />
          <path d="M5 12 3 6h18l-2 6" />
          <path d="M3 12v6h18v-6" />
        </svg>
      );
    case "alertTriangle":
      return (
        <svg {...common}>
          <path d="M12 4 2 20h20Z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case "mapPin":
      return (
        <svg {...common}>
          <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m4 17 5-5 3 3 4-5 4 4" />
        </svg>
      );
    case "arrowLeft":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        </svg>
      );
    case "shoppingCart":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2.5 3h2l2.2 12.1a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6" />
        </svg>
      );
    default:
      return null;
  }
}
