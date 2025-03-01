import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users-page";
import UptimeLogPage from "@/pages/uptime-log-page";
import SettingsPage from "@/pages/settings-page";
import PendingPage from "@/pages/pending-page";
import TicketsPage from "@/pages/tickets-page";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { DiscordButton } from "@/components/discord-button";
import { FaviconUpdater } from "@/components/favicon-updater";
import { ErrorBoundary } from "@/components/error-boundary";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ErrorBoundary>
              <FaviconUpdater />
              <Switch>
                <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
                <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
                <Route path="/uptime-log" component={() => <ProtectedRoute component={UptimeLogPage} />} />
                <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
                <Route path="/tickets" component={() => <ProtectedRoute component={TicketsPage} />} />
                <Route path="/auth" component={AuthPage} />
                <Route path="/pending" component={PendingPage} />
                <Route component={NotFound} />
              </Switch>
              <Toaster />
              <div className="fixed bottom-4 right-4 z-50">
                <DiscordButton />
              </div>
            </ErrorBoundary>
          </AuthProvider>
        </QueryClientProvider>
      </div>
    </ThemeProvider>
  );
}