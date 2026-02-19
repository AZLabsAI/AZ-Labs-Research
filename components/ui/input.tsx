import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "focus-ring file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-3 py-2 text-sm text-[var(--on-surface)] shadow-[var(--shadow-xs)] transition-[border-color,background-color,box-shadow,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        "hover:border-[color-mix(in_srgb,var(--primary-accent)_28%,hsl(var(--border)))] focus-visible:border-[color-mix(in_srgb,var(--primary-accent)_55%,hsl(var(--border)))]",
        "aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,hsl(var(--destructive))_30%,transparent)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
