import clsx from "clsx";
import { LABEL } from "@/lib/domain/recommendation/labels";

const POSITIVE_LABELS: string[] = [
  LABEL.RECOMMENDED,
  LABEL.CHEAPEST_UNIT_PRICE,
  LABEL.CHEAPEST_TOTAL,
  LABEL.FREE_SHIPPING,
  LABEL.FASTEST_DELIVERY,
  LABEL.CLOSEST,
  LABEL.STOCK_AVAILABLE,
];

const WARNING_LABELS: string[] = [LABEL.STOCK_LIMITED, LABEL.NEEDS_CONFIRMATION];

function labelClasses(label: string): string {
  if (label === LABEL.RECOMMENDED) {
    return "bg-indigo-600 text-white";
  }
  if (POSITIVE_LABELS.includes(label)) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (WARNING_LABELS.includes(label)) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

export function LabelBadge({ label }: { label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        labelClasses(label),
      )}
    >
      {label}
    </span>
  );
}

export function LabelBadgeList({ labels }: { labels: readonly string[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <LabelBadge key={label} label={label} />
      ))}
    </div>
  );
}
