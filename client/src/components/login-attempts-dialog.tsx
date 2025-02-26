import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoginAttempt } from "@shared/schema";
import { format } from "date-fns";
import { Shield } from "lucide-react";

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
      <DialogContent className="sm:max-w-[800px]">
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
                    <p className="font-medium">{attempt.identifier}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(attempt.timestamp), "PPp")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Type: {attempt.type}</p>
                  </div>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium">IP: {attempt.ip}</p>
                  {attempt.isp && <p>ISP: {attempt.isp}</p>}
                  {attempt.city && <p>City: {attempt.city}</p>}
                  {attempt.region && <p>Region: {attempt.region}</p>}
                  {attempt.country && <p>Country: {attempt.country}</p>}
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