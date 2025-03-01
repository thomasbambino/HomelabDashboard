import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PasskeyEnrollmentDialog } from "@/components/passkey-enrollment-dialog";

// Extend SelectUser type to include the requires_password_change field
type AuthUser = SelectUser & {
  requires_password_change: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      if (!res.ok) {
        throw new Error("Login failed");
      }
      console.log("Login response:", data);
      return data;
    },
    onSuccess: (user: AuthUser) => {
      console.log("Setting user data with requires_password_change:", user.requires_password_change);
      queryClient.setQueryData(["/api/user"], user);

      // Check if we should show the passkey enrollment dialog
      const passkeyChoiceMade = localStorage.getItem('passkey-choice-made');
      if (!passkeyChoiceMade && !user.requires_password_change) {
        setShowPasskeyDialog(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
        action: (
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 text-sm font-medium text-white bg-destructive border-2 border-white rounded-md hover:bg-destructive/90"
              onClick={() => setLocation("/auth?tab=reset")}
            >
              Reset Password
            </button>
          </div>
        ),
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }
      return data;
    },
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePasskeyEnrollment = async () => {
    try {
      // TODO: Implement passkey enrollment logic here
      // This should create a new passkey for the user
      localStorage.setItem('passkey-choice-made', 'true');
      toast({
        title: "Success",
        description: "Passkey has been set up successfully!",
      });
    } catch (error) {
      console.error('Passkey enrollment error:', error);
      toast({
        title: "Failed to set up passkey",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
      <PasskeyEnrollmentDialog
        open={showPasskeyDialog}
        onOpenChange={setShowPasskeyDialog}
        onEnroll={handlePasskeyEnrollment}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}