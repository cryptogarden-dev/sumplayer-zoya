"use client";

import type { ComparisonFiltersState } from "@/components/perbandingan/types";

interface ComparisonFiltersProps {
  value: ComparisonFiltersState;
  onChange: (value: ComparisonFiltersState) => void;
}

const OPTIONS: { key: keyof ComparisonFiltersState; label: string }[] = [
  { key: "onlyAvailable", label: "Hanya tersedia" },
  { key: "onlyFreeShipping", label: "Gratis ongkir" },
  { key: "onlyServesDestination", label: "Melayani area saya" },
  { key: "onlyArrivesInTime", label: "Dapat tiba sesuai tanggal" },
];

export function ComparisonFilters({ value, onChange }: ComparisonFiltersProps) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {OPTIONS.map((option) => (
        <label key={option.key} className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={value[option.key]}
            onChange={(event) => onChange({ ...value, [option.key]: event.target.checked })}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
