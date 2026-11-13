import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          "border-cloud text-slate placeholder:text-muted focus:border-slate focus:ring-cloud min-h-11 w-full rounded-xl border px-3 text-base focus:ring-2 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);
