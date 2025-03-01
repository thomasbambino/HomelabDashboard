import { Button } from "@/components/ui/button";
import { signInWithPasskeyCredential } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

export function PasskeyAuthButton() {
  const { toast } = useToast();
  const { loginMutation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handlePasskeyAuth = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPasskeyCredential();

      if (!result) {
        throw new Error("Authentication failed");
      }

      if ('user' in result) {
        // Get the ID token to pass to our backend
        const idToken = await result.user.getIdToken();
        // Call our backend authentication endpoint
        await loginMutation.mutateAsync({ token: idToken });
      } else {
        // Handle MFA resolver case
        console.log("MFA resolution required");
        toast({
          title: "Additional Authentication Required",
          description: "Please complete the multi-factor authentication.",
        });
      }
    } catch (error) {
      console.error('Passkey authentication error:', error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Failed to authenticate with passkey. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      className="w-full"
      onClick={handlePasskeyAuth}
      disabled={isLoading}
    >
      <Fingerprint className="mr-2 h-4 w-4" />
      {isLoading ? "Authenticating..." : "Continue with Passkey"}
    </Button>
  );
}