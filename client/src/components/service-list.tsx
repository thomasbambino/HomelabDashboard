import { Service } from "@shared/schema";
import { ServiceCard } from "./service-card";

interface ServiceListProps {
  services: Service[];
  timeScale: string;
}

export function ServiceList({ services, timeScale }: ServiceListProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} timeScale={timeScale} />
      ))}
    </div>
  );
}