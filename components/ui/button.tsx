import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] text-sm font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] disabled:pointer-events-none data-[disabled]:pointer-events-none disabled:opacity-60 data-[disabled]:opacity-60 disabled:saturate-50 data-[disabled]:saturate-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary-accent)] text-white shadow-[var(--shadow-sm)] hover:-translate-y-px hover:bg-[var(--primary-accent-strong)] active:translate-y-0",
        destructive:
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] shadow-[var(--shadow-sm)] hover:-translate-y-px hover:brightness-95",
        outline:
          "border border-[hsl(var(--border))] bg-[var(--surface-container)] text-[var(--on-surface)] shadow-[var(--shadow-xs)] hover:border-[color-mix(in_srgb,var(--primary-accent)_30%,transparent)] hover:bg-[var(--surface-container-low)]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,hsl(var(--secondary))_88%,var(--primary-accent)_12%)]",
        ghost:
          "text-[var(--on-surface-variant)] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        link: "text-[var(--primary-accent)] underline-offset-4 hover:underline",
        code:
          "h-9 rounded-[12px] bg-[#2f2a25] px-4 text-white shadow-[inset_0_-2px_0_#171310,0_1px_6px_rgba(40,25,12,0.35)] hover:-translate-y-px hover:bg-[#3c352f]",
        blue:
          "bg-[var(--primary-accent)] text-white shadow-[var(--shadow-sm)] hover:-translate-y-px hover:bg-[var(--primary-accent-strong)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingLabel?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingLabel = "Loading",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = Boolean(disabled || loading)

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          data-disabled={isDisabled ? "true" : undefined}
          aria-disabled={isDisabled || undefined}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        data-loading={loading ? "true" : undefined}
        data-disabled={isDisabled ? "true" : undefined}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        <span>{children}</span>
        {loading && <span className="sr-only">{loadingLabel}</span>}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
