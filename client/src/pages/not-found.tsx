import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-card-foreground">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>

          <p className="text-muted-foreground mb-4">
            The page you're looking for doesn't exist.
          </p>

          <Link 
            href="/" 
            className="inline-block text-primary hover:underline hover:text-primary/90"
          >
            Return to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}