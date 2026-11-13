import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("border-divider rounded-[20px] border bg-white p-5", className)}
      {...props}
    />
  );
}
