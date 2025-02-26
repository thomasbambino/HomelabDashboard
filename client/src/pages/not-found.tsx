import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-card-foreground">404 Page Not Found</h1>
          </div>

          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/90 transition-colors"
          >
            Return to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}