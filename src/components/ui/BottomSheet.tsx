"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
}

/**
 * Panel pilihan bergaya marketplace (permintaan pengguna 2026-08-20):
 * muncul dari bawah di HP, dan sebagai modal di tengah pada layar lebar.
 * Dibangun di atas Radix Dialog (sudah dipakai untuk dropdown menu profil)
 * agar fokus/escape/scroll-lock tertangani otomatis tanpa kode tambahan.
 */
export function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-6 shadow-xl focus:outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          aria-describedby={undefined}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            {title ? (
              <Dialog.Title className="text-base font-semibold text-slate-900">
                {title}
              </Dialog.Title>
            ) : (
              <Dialog.Title className="sr-only">Detail</Dialog.Title>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-3">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
