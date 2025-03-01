import { createContext, ReactNode, useContext, useState, useEffect } from "react";
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
import { auth } from "@/lib/firebase";

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
        // Wait a bit to ensure Firebase auth is initialized
        setTimeout(() => {
          setShowPasskeyDialog(true);
        }, 1000);
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
      // Verify Firebase auth state
      if (!auth.currentUser) {
        throw new Error("Please ensure you're logged in before setting up a passkey");
      }

      // Get the current user's ID token
      const idToken = await auth.currentUser.getIdToken();
      if (!idToken) {
        throw new Error("Failed to get authentication token");
      }

      console.log("Getting challenge from server...");

      // Get the challenge from the server
      const challengeResponse = await fetch("/api/auth/passkey/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!challengeResponse.ok) {
        const error = await challengeResponse.text();
        throw new Error(`Failed to get challenge: ${error}`);
      }

      const { challenge, userId } = await challengeResponse.json();
      console.log("Got challenge from server", { userId });

      // Create the credentials
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(challenge),
          rp: {
            name: "Homelab Dashboard",
            id: window.location.hostname
          },
          user: {
            id: new Uint8Array(Buffer.from(userId)),
            name: user?.email || "",
            displayName: user?.username || "",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 } // RS256
          ],
          timeout: 60000,
          attestation: "direct",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            requireResidentKey: true,
            residentKey: "required",
            userVerification: "required"
          }
        }
      });

      if (!credential) {
        throw new Error("Failed to create passkey");
      }

      console.log("Created credential, registering with server...");

      // Register the credential with Firebase
      const res = await fetch("/api/auth/passkey/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ credential })
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to register passkey: ${error}`);
      }

      // Store that user has made a choice about passkeys
      localStorage.setItem('passkey-choice-made', 'true');

      toast({
        title: "Success",
        description: "Passkey has been set up successfully!",
      });

      // Close the dialog
      setShowPasskeyDialog(false);
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