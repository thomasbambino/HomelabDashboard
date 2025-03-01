import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Fingerprint } from "lucide-react";

interface PasskeyEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnroll: () => Promise<void>;
}

export function PasskeyEnrollmentDialog({
  open,
  onOpenChange,
  onEnroll
}: PasskeyEnrollmentDialogProps) {
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      await onEnroll();
      // Store that user has made a choice about passkeys
      localStorage.setItem('passkey-choice-made', 'true');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to enroll passkey:', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSkip = () => {
    // Store that user has made a choice about passkeys
    localStorage.setItem('passkey-choice-made', 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Set up Passkey Authentication
          </DialogTitle>
          <DialogDescription>
            Enhance your account security by setting up passkey authentication.
            This allows you to sign in quickly and securely using your device's
            biometric sensors or security keys.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isEnrolling}
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={isEnrolling}
          >
            {isEnrolling ? "Setting up..." : "Set up Passkey"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
