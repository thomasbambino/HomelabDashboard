import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NavIconButton } from "@/components/ui/nav-icon-button";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";
import { Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface UptimeLogDialogProps {
  children?: React.ReactNode;
}

// Uptime logging functionality has been removed to reduce database usage
export function UptimeLogDialog({ children }: UptimeLogDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Always return null - uptime logging disabled
  return null;
}
