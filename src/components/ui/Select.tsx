import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(
          "border-cloud text-slate focus:border-slate focus:ring-cloud min-h-11 w-full rounded-xl border bg-white px-3 text-base focus:ring-2 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);
