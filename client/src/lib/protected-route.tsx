import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  return (
    <Route path={path}>
      {(params) => {
        try {
          const { user, isLoading } = useAuth();

          if (isLoading) {
            return (
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            );
          }

          if (!user) {
            window.location.href = "/auth";
            return null;
          }

          if (!user.approved) {
            window.location.href = "/pending";
            return null;
          }

          return <Component {...params} />;
        } catch (error) {
          console.error('Auth context error:', error);
          window.location.href = "/auth";
          return null;
        }
      }}
    </Route>
  );
}