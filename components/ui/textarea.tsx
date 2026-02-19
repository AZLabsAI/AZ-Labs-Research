import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "focus-ring placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-3 py-2 text-sm text-[var(--on-surface)] shadow-[var(--shadow-xs)] transition-[border-color,background-color,box-shadow,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none",
        "hover:border-[color-mix(in_srgb,var(--primary-accent)_28%,hsl(var(--border)))] focus-visible:border-[color-mix(in_srgb,var(--primary-accent)_55%,hsl(var(--border)))]",
        "aria-invalid:border-destructive aria-invalid:focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,hsl(var(--destructive))_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
