import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ChatProvider } from "./lib/chat-context";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users-page";
import PendingPage from "@/pages/pending-page";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatButton } from "@/components/chat/chat-button";
import { FaviconUpdater } from "@/components/favicon-updater";
import { ForcePasswordChangeDialog } from "@/components/force-password-change-dialog";

function Router() {
  const { user } = useAuth();

  return (
    <>
      {user?.requires_password_change && <ForcePasswordChangeDialog />}
      <Switch>
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/users" component={UsersPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/pending" component={PendingPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ChatProvider>
              <Router />
              <div className="fixed bottom-4 right-4 z-50">
                <ChatButton />
              </div>
              <Toaster />
              <FaviconUpdater />
            </ChatProvider>
          </AuthProvider>
        </QueryClientProvider>
      </div>
    </ThemeProvider>
  );
}