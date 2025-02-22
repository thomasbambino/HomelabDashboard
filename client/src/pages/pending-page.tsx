import { ServerCog } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <ServerCog className="h-16 w-16 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">Account Pending Approval</h1>
        <p className="text-muted-foreground">
          Your account is currently pending administrator approval. You'll be able to access the
          dashboard once your account has been approved. Please check back later.
        </p>
      </div>
    </div>
  );
}
