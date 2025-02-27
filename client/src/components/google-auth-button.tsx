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
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Send the token to our backend to verify and create/update user session
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: idToken })
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with the server');
      }

      // Backend will set the session cookie and return the user data
      await response.json();
      window.location.href = '/'; // Redirect to home page after successful authentication
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: "Authentication failed",
        description: "Could not sign in with Google. Please try again.",
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