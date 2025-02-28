import * as React from "react"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"

interface NavIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const NavIconButton = React.forwardRef<HTMLButtonElement, NavIconButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md p-0",
          "text-muted-foreground transition-colors hover:text-foreground",
          "hover:bg-transparent focus-visible:outline-none focus-visible:ring-1",
          "focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
NavIconButton.displayName = "NavIconButton"

export { NavIconButton }
