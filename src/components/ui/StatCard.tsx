import { Card } from "@/components/ui/Card";
import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: number;
  description?: string;
  /** Kartu gelap brand Zoya (bg slate, teks putih) — dipakai untuk kartu
   * KPI ke-4 di halaman Supplier (docs/design/DESIGN_SPEC.md §5). */
  variant?: "default" | "dark";
}

const numberFormatter = new Intl.NumberFormat("id-ID");

export function StatCard({ label, value, description, variant = "default" }: StatCardProps) {
  const dark = variant === "dark";
  return (
    <Card className={clsx(dark && "border-slate bg-slate")}>
      <p className={clsx("text-[13px] font-medium", dark ? "text-white/70" : "text-muted")}>
        {label}
      </p>
      <p
        className={clsx(
          "mt-2 text-[28px] leading-none font-bold",
          dark ? "text-white" : "text-slate",
        )}
      >
        {numberFormatter.format(value)}
      </p>
      {description ? (
        <p className={clsx("mt-2 text-xs", dark ? "text-white/70" : "text-muted")}>{description}</p>
      ) : null}
    </Card>
  );
}
