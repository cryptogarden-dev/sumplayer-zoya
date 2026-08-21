import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: number;
  description?: string;
}

const numberFormatter = new Intl.NumberFormat("id-ID");

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(value)}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </Card>
  );
}
