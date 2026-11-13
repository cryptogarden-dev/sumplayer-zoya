import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-slate text-white hover:bg-slate/90 focus-visible:outline-slate",
  secondary: "border border-cloud bg-white text-slate hover:bg-page focus-visible:outline-slate",
  ghost: "bg-transparent text-slate hover:bg-page focus-visible:outline-slate",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
});
