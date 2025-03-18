import { Settings } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { NavigationBar } from "@/components/navigation-bar";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Uptime logging feature has been disabled to reduce database usage
export default function UptimeLogPage() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Redirect users to homepage
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <NavigationBar settings={settings} pageTitle="Uptime Log" />
        <main className="container mx-auto px-4 pt-36 pb-6 space-y-6">
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Feature Disabled</CardTitle>
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Uptime logging has been disabled to reduce database usage and improve performance.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </PageTransition>
  );
}