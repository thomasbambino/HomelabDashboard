import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
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

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ChatProvider>
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