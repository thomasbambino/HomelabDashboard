import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users-page";
import PendingPage from "@/pages/pending-page";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { StrictMode } from 'react';

export default function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" attribute="class">
            <div className="min-h-screen bg-background text-foreground">
              <Switch>
                <Route path="/auth" component={AuthPage} />
                <ProtectedRoute path="/" component={Dashboard} />
                <ProtectedRoute path="/users" component={UsersPage} />
                <Route path="/pending" component={PendingPage} />
                <Route component={NotFound} />
              </Switch>
              <Toaster />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}