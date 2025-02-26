import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoginAttempt } from "@shared/schema";
import { format } from "date-fns";
import { Shield, CheckCircle2, XCircle, Network } from "lucide-react";
import { 
  SiAmazon, SiGoogle, SiMicrosoft, SiXfinity, SiBox, SiTmobile,
  SiVerizon, SiSpectrum, SiLinode, SiDigitalocean, SiAzure, 
  SiCloudflare, SiAkamai
} from "react-icons/si";

// Map common ISP names to their icons
const ispIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Amazon': SiAmazon,
  'Google': SiGoogle,
  'Microsoft': SiMicrosoft,
  'Azure': SiAzure,
  'Comcast': SiXfinity,
  'Xfinity': SiXfinity,
  'T-Mobile': SiTmobile,
  'Verizon': SiVerizon,
  'Spectrum': SiSpectrum,
  'DigitalOcean': SiDigitalocean,
  'Linode': SiLinode,
  'Cloudflare': SiCloudflare,
  'Akamai': SiAkamai,
  'Cox': SiBox
};

function getISPIcon(ispName: string): React.ComponentType<{ className?: string }> {
  // Check for exact matches
  if (ispName in ispIcons) return ispIcons[ispName];

  // Check for partial matches
  const lowercaseIsp = ispName.toLowerCase();
  for (const [key, icon] of Object.entries(ispIcons)) {
    if (lowercaseIsp.includes(key.toLowerCase())) return icon;
  }

  // Return default network icon if no match found
  return Network;
}

export function LoginAttemptsDialog() {
  const { data: loginAttempts = [] } = useQuery<LoginAttempt[]>({
    queryKey: ["/api/login-attempts"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
          <Shield className="h-4 w-4 mr-2" />
          Login Attempts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Login Attempts</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[600px] rounded-md border p-4">
          <div className="space-y-4">
            {loginAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="p-4 rounded-lg border space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {attempt.type === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <p className="font-medium">{attempt.identifier}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(attempt.timestamp), "PPp")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {attempt.type === 'success' ? 'Successful Login' : 'Failed Attempt'}
                    </p>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-md space-y-1">
                  <p className="font-medium">IP: {attempt.ip}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    {attempt.isp && (
                      <p className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">ISP:</span>
                        {React.createElement(getISPIcon(attempt.isp), {
                          className: "h-4 w-4 text-blue-500"
                        })}
                        <span>{attempt.isp}</span>
                      </p>
                    )}
                    {attempt.city && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">City:</span> {attempt.city}
                      </p>
                    )}
                    {attempt.region && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Region:</span> {attempt.region}
                      </p>
                    )}
                    {attempt.country && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Country:</span> {attempt.country}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loginAttempts.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No login attempts found
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}