import { Service } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings } from "lucide-react";
import { EditServiceDialog } from "./edit-service-dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
            <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
              <Settings className="h-4 w-4" />
            </Button>
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