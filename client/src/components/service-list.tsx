import { Service } from "@shared/schema";
import { ServiceCard } from "./service-card";

interface ServiceListProps {
  services: Service[];
}

export function ServiceList({ services }: ServiceListProps) {
  const sortedServices = [...services].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {sortedServices.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}