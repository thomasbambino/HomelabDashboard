import React from 'react';
import { Button } from "@/components/ui/button";
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { ISPIcon } from '@/components/isp-icons/ISPIcon.js';
import { Loader2 } from 'lucide-react';

export function GoogleAuthButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Try to sign in with Google
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Send the token to our backend
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: idToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to authenticate with the server');
      }

      // Backend will set the session cookie and return the user data
      await response.json();

      // Only redirect after successful authentication
      window.location.href = '/';
    } catch (error) {
      console.error('Google sign in error:', error);

      // Show more specific error messages
      let errorMessage = "Could not sign in with Google. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('popup')) {
          errorMessage = "The sign-in popup was closed. Please try again.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error occurred. Please check your connection and try again.";
        }
      }

      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full flex items-center gap-2" 
      onClick={handleGoogleSignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ISPIcon ispName="Google" size={20} />
      )}
      Sign in with Google
    </Button>
  );
}