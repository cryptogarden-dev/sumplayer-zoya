import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/supplier",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { BottomNav } from "@/components/app-shell/BottomNav";

describe("BottomNav (R24 - navigasi bawah di HP, R25 - 4 menu utama)", () => {
  it("menampilkan tepat 4 tautan navigasi", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Navigasi utama" });
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
  });

  it("menandai menu yang sesuai dengan halaman aktif", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /supplier/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /produk/i })).not.toHaveAttribute("aria-current");
  });

  it("menampilkan label Supplier, Produk, Bandingkan, dan Pesanan", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /supplier/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /produk/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bandingkan/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pesanan/i })).toBeInTheDocument();
  });
});
