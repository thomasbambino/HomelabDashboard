import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { RegisterPasskeyButton } from "@/components/register-passkey-button";
import { Button } from "@/components/ui/button";

interface LoginCredentials {
  username: string;
  password: string;
}

interface TokenCredentials {
  token: string;
}

interface User {
  id: number;
  username: string;
  requires_password_change?: boolean;
  show_passkey_prompt?: boolean;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials | TokenCredentials) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const user = await response.json() as User;

      // If user needs to change password, show the force change dialog
      if (user.requires_password_change) {
        setLocation("/change-password");
        return user;
      }

      // Show passkey registration prompt if flag is set
      if (user.show_passkey_prompt) {
        toast({
          title: "Enable Passwordless Login",
          description: "Set up a passkey to sign in quickly and securely next time.",
          action: (
            <Button
              variant="outline"
              onClick={() => {
                const register = document.createElement('div');
                register.appendChild(
                  <RegisterPasskeyButton username={user.username} /> as unknown as Node
                );
                document.body.appendChild(register);
              }}
            >
              Register Passkey
            </Button>
          ),
          duration: 10000,
        });
      }

      // Redirect to home page after successful login
      setLocation("/");
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    },
  });

  return {
    loginMutation,
  };
}