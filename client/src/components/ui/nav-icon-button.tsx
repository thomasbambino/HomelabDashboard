import * as React from "react"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"

interface NavIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const NavIconButton = React.forwardRef<HTMLButtonElement, NavIconButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md",
          "h-8 w-8 sm:h-12 sm:w-12",
          "border-0 border-none outline-none",
          "bg-transparent text-foreground",
          "hover:bg-transparent hover:text-foreground/80",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "transition-all duration-200",
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