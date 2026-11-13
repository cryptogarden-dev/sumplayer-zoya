"use client";

import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";

/**
 * Dialog konfirmasi hapus di dalam aplikasi — pengganti `window.confirm`
 * (perbaikan #3, 2026-11-13). Dialog native browser otomatis tertutup
 * begitu saja di browser (auto-dismiss) sehingga tombol hapus terkesan
 * tidak merespons sama sekali; dialog ini berbasis Radix Dialog lewat
 * BottomSheet jadi bisa diklik normal, ditutup dengan ✕ / Batal / Escape.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Hapus Permanen",
  cancelLabel = "Batal",
  onConfirm,
  isBusy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isBusy?: boolean;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex gap-3">
        <Button
          variant="danger"
          disabled={isBusy}
          onClick={() => {
            onOpenChange(false);
            onConfirm();
          }}
        >
          {isBusy ? "Menghapus..." : confirmLabel}
        </Button>
        <Button variant="secondary" disabled={isBusy} onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
