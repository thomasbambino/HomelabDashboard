import { Service } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings, Trash2 } from "lucide-react";
import { EditServiceDialog } from "./edit-service-dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
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

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

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

  return (
    <Card className={`relative ${service.background ? `bg-[url('${service.background}')] bg-cover` : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {service.icon && <span className="text-xl">{service.icon}</span>}
          <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={service.status ? "default" : "destructive"}>
            {service.status ? "Online" : "Offline"}
          </Badge>
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
      <CardContent>
        <a
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <ExternalLink className="h-4 w-4" />
          {service.url}
        </a>
        <p className="text-xs text-muted-foreground mt-2">
          Last checked: {new Date(service.lastChecked).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          Refresh interval: {service.refreshInterval}s
        </p>
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