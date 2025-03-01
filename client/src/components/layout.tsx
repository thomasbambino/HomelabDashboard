import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn(
        "container mx-auto px-4 md:px-8",
        "max-w-[1250px]", // Fixed max-width for consistency
        className
      )}>
        {children}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}