import { Service } from "@shared/schema";
import { ServiceCard } from "./service-card";
import { UptimeLogDialog } from "./uptime-log-dialog";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";

interface ServiceListProps {
  services: Service[];
  timeScale: string;
}

export function ServiceList({ services, timeScale }: ServiceListProps) {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  return (
    <div className="space-y-4">
      {settings?.showUptimeLog && (
        <div className="flex justify-end">
          <UptimeLogDialog />
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} timeScale={timeScale} />
        ))}
      </div>
    </div>
  );
}