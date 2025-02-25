
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
import { ChatButton } from "@/components/chat/chat-button";
import { FaviconUpdater } from "@/components/favicon-updater";
import { ChartContext } from "@/components/ui/chart";
import { CarouselContext } from "@/components/ui/carousel";
import { SidebarContext } from "@/components/ui/sidebar";

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
            <ChartContext.Provider value={{ config: {} }}>
              <CarouselContext.Provider value={{}}>
                <SidebarContext.Provider value={{ isCollapsed: false, setIsCollapsed: () => {} }}>
                  <Router />
                  <Toaster />
                  <ChatButton />
                  <FaviconUpdater />
                </SidebarContext.Provider>
              </CarouselContext.Provider>
            </ChartContext.Provider>
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
