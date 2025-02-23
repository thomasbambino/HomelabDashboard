import { Service } from "@shared/schema";
import { ServiceCard } from "./service-card";
import { UptimeLogDialog } from "./uptime-log-dialog";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface ServiceListProps {
  services: Service[];
  timeScale: string;
}

export function ServiceList({ services, timeScale }: ServiceListProps) {
  const { user } = useAuth();
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Debug log to see what settings we're getting
  console.log('Settings:', settings);
  console.log('User role:', user?.role);
  console.log('Should show uptime log:', user?.role === 'admin' ? settings?.adminShowUptimeLog : settings?.showUptimeLog);

  // Show uptime log if user is admin and adminShowUptimeLog is true
  // or if user is not admin and showUptimeLog is true
  const showUptimeLog = user?.role === 'admin' 
    ? settings?.adminShowUptimeLog 
    : settings?.showUptimeLog;

  return (
    <div className="space-y-4">
      {showUptimeLog && (
        <div className="flex justify-end">
          <UptimeLogDialog />
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}