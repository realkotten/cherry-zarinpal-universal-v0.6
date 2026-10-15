import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-2xl border border-[var(--lq-control-rim,rgba(28,28,40,0.16))] bg-[var(--lq-control,rgba(255,255,255,0.78))] px-3.5 py-2 text-sm text-[var(--lq-text,#0f172a)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow,background-color] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--lq-text-dim,#64748b)] focus-visible:bg-white/95 focus-visible:border-[var(--lq-accent,#721c24)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--lq-accent,#721c24)_22%,transparent),inset_0_1px_0_rgba(255,255,255,1)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
