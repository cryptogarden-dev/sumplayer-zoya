export default function DashboardLoading() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div
        role="status"
        aria-label="Memuat"
        className="border-t-slate h-8 w-8 animate-spin rounded-full border-4 border-slate-200"
      />
    </div>
  );
}
