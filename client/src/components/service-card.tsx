import { Service } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
        <Badge variant={service.status ? "default" : "destructive"}>
          {service.status ? "Online" : "Offline"}
        </Badge>
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
      </CardContent>
    </Card>
  );
}
