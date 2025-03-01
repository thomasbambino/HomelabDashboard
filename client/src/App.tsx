import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient.js";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./hooks/use-auth.js";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users-page";
import SettingsPage from "@/pages/settings-page";
import UptimeLogPage from "@/pages/uptime-log-page";
import PendingPage from "@/pages/pending-page";
import { ProtectedRoute } from "./lib/protected-route.js";
import { ThemeProvider } from "@/components/theme-provider";
import { DiscordButton } from "@/components/discord-button";
import { FaviconUpdater } from "@/components/favicon-updater";
import { LPMetadataProvider } from "@/components/metadata-provider";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/uptime-log" component={UptimeLogPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/pending" component={PendingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <LPMetadataProvider>
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground">
              <FaviconUpdater />
              <Router />
              <Toaster />
              <div className="fixed bottom-4 right-4 flex items-center gap-2" style={{ zIndex: 9999 }}>
                <DiscordButton />
              </div>
            </div>
          </AuthProvider>
        </LPMetadataProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;