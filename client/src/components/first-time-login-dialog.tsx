import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Info, Server, Video } from "lucide-react";

interface FirstTimeLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FirstTimeLoginDialog({ open, onOpenChange }: FirstTimeLoginDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasSeenDialog, setHasSeenDialog] = useState(false);

  useEffect(() => {
    // Check if the user has seen this dialog before
    const hasSeenFirstTimeDialog = localStorage.getItem("hasSeenFirstTimeDialog");
    setHasSeenDialog(!!hasSeenFirstTimeDialog);
  }, []);

  const handleClose = () => {
    // Save that the user has seen this dialog
    localStorage.setItem("hasSeenFirstTimeDialog", "true");
    onOpenChange(false);
  };

  const steps = [
    {
      title: "Welcome to the Homelab Dashboard!",
      description: (
        <div className="space-y-4">
          <p>
            This dashboard gives you access to monitor and control various homelab services, 
            including game servers and media streaming services.
          </p>
          <p>
            Let's take a few moments to get you set up and familiar with some key features.
          </p>
        </div>
      ),
      icon: <Info className="h-8 w-8 text-primary" />,
    },
    {
      title: "Connecting to Plex Media Server",
      description: (
        <div className="space-y-4">
          <p>
            Our Plex Media Server provides movies, TV shows, and other media content.
            To access it, you'll need to be invited to our Plex server.
          </p>
          <p className="font-medium">To get access:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Click the "Invite Plex" button in the dashboard</li>
            <li>Enter your email to receive a Plex invitation</li>
            <li>Follow the instructions in the email to create your Plex account</li>
            <li>Once accepted, you'll have access to all our media content</li>
          </ol>
        </div>
      ),
      icon: <Video className="h-8 w-8 text-primary" />,
    },
    {
      title: "Using Overseer with Your Plex Account",
      description: (
        <div className="space-y-4">
          <p>
            <span className="font-medium">Overseer</span> is a request system that lets you request movies and TV shows to be added to our Plex server.
          </p>
          <p>
            After you set up your Plex account:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Visit the Overseer portal using your Plex login credentials</li>
            <li>Browse available content or search for specific titles</li>
            <li>Submit requests for new content you'd like to watch</li>
            <li>Get notified when your requests are fulfilled</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-4">
            Note: The same Plex credentials you create will work for both Plex and Overseer!
          </p>
        </div>
      ),
      icon: <Server className="h-8 w-8 text-primary" />,
    },
  ];

  return (
    <Dialog open={open && !hasSeenDialog} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {steps[currentStep - 1].icon}
            {steps[currentStep - 1].title}
          </DialogTitle>
          <DialogDescription>
            {steps[currentStep - 1].description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 mt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300",
                currentStep === index + 1
                  ? "bg-primary w-4"
                  : index + 1 < currentStep
                  ? "bg-primary opacity-70"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex sm:justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
            )}
            {currentStep < steps.length ? (
              <Button onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length))}>
                Next
              </Button>
            ) : (
              <Button onClick={handleClose} className="gap-2">
                <Check className="h-4 w-4" />
                Got it
              </Button>
            )}
          </div>
          {currentStep < steps.length && (
            <Button variant="ghost" onClick={handleClose}>
              Skip Intro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}