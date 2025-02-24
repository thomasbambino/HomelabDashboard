import { Service } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings, Trash2 } from "lucide-react";
import { EditServiceDialog } from "./edit-service-dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings as SettingsType } from "@shared/schema";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Hide NSFW content from users without permission
  if (service.isNSFW && !user?.can_view_nsfw && !isAdmin) {
    return null;
  }

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/services/${service.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Service deleted",
        description: "The service has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Use the appropriate visibility settings based on user role
  const showRefreshInterval = isAdmin ? settings?.admin_show_refresh_interval : settings?.show_refresh_interval;
  const showLastChecked = isAdmin ? settings?.admin_show_last_checked : settings?.show_last_checked;
  const showServiceUrl = isAdmin ? settings?.admin_show_service_url : settings?.show_service_url;

  // Create the background style with proper URL formatting
  const cardStyle = service.background ? {
    backgroundImage: `url('${service.background}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  return (
    <Card className="relative" style={cardStyle}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {service.icon && (
              <div className="w-6 h-6 flex items-center justify-center">
                <img
                  src={service.icon}
                  alt={`${service.name} icon`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
          </div>
          {service.tooltip && (
            <p className="text-sm text-muted-foreground pt-1">{service.tooltip}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="default"
            style={{
              backgroundColor: service.status ?
                settings?.online_color || "#22c55e" :
                settings?.offline_color || "#ef4444",
              color: "white"
            }}
          >
            {service.status ? "Online" : "Offline"}
          </Badge>
          {service.isNSFW && (
            <Badge
              variant="outline"
              style={{
                backgroundColor: "#ec4899",
                color: "white",
                borderColor: "#ec4899"
              }}
            >
              NSFW
            </Badge>
          )}
          {isAdmin && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Service</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {service.name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteServiceMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {showServiceUrl && (
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            {service.url}
          </a>
        )}
        {showLastChecked && (
          <p className="text-sm text-muted-foreground">
            Last checked: {new Date(service.lastChecked).toLocaleString()}
          </p>
        )}
        {showRefreshInterval && (
          <p className="text-sm text-muted-foreground">
            Refresh interval: {service.refreshInterval}s
          </p>
        )}
      </CardContent>
      {isAdmin && (
        <EditServiceDialog
          service={service}
          open={showEdit}
          onOpenChange={setShowEdit}
        />
      )}
    </Card>
  );
}