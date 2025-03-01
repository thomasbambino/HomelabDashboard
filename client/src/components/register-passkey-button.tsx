import { Button } from "@/components/ui/button";
import { createPasskey } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";
import { useState } from "react";

type RegisterPasskeyButtonProps = {
  userId: string;
  username: string;
};

export function RegisterPasskeyButton({ userId, username }: RegisterPasskeyButtonProps) {
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterPasskey = async () => {
    try {
      setIsRegistering(true);
      await createPasskey(userId, username);
      
      toast({
        title: "Passkey Created",
        description: "You can now use your passkey to sign in to your account.",
      });
    } catch (error) {
      console.error('Passkey registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register passkey. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      className="w-full"
      onClick={handleRegisterPasskey}
      disabled={isRegistering}
    >
      <KeyRound className="mr-2 h-4 w-4" />
      {isRegistering ? "Setting up..." : "Register Passkey"}
    </Button>
  );
}
