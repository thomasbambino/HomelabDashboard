import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "./hooks/use-auth";
import { ChatProvider } from "./lib/chat-context";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users-page";
import PendingPage from "@/pages/pending-page";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatButton } from "@/components/chat/chat-button";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/pending" component={PendingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SocialButtons() {
  const [location] = useLocation();

  // Hide social buttons on auth and pending pages
  if (location === "/auth" || location === "/pending") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <ChatButton />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ChatProvider>
              <SocialButtons />
              <Router />
              <Toaster />
            </ChatProvider>
          </AuthProvider>
        </QueryClientProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;