export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div
        role="status"
        aria-label="Memuat"
        className="border-t-slate h-10 w-10 animate-spin rounded-full border-4 border-slate-200"
      />
    </div>
  );
}
