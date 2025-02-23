import { Service } from "@shared/schema";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ServiceCard } from "./service-card";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";

interface ServiceListProps {
  services: Service[];
  timeScale: string;
}

export function ServiceList({ services, timeScale }: ServiceListProps) {
  const { user } = useAuth();
  const [orderedServices, setOrderedServices] = useState<Service[]>([]);

  // Initialize the ordered services
  useEffect(() => {
    if (!services) {
      setOrderedServices([]);
      return;
    }

    if (!user?.serviceOrder?.length) {
      setOrderedServices(services);
      return;
    }

    // Create a map of services by ID for quick lookup
    const serviceMap = new Map(services.map(s => [s.id, s]));

    // First, add services in the user's preferred order
    const ordered = user.serviceOrder
      .map(id => serviceMap.get(id))
      .filter((s): s is Service => s !== undefined);

    // Then add any new services that aren't in the order yet
    const remainingServices = services.filter(s => !user.serviceOrder?.includes(s.id));
    setOrderedServices([...ordered, ...remainingServices]);
  }, [services, user?.serviceOrder]);

  const updateOrderMutation = useMutation({
    mutationFn: async (serviceOrder: number[]) => {
      const res = await apiRequest("PATCH", `/api/user`, { serviceOrder });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(orderedServices);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedServices(items);
    updateOrderMutation.mutate(items.map(s => s.id));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="services">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          >
            {orderedServices.map((service, index) => (
              <Draggable key={service.id} draggableId={String(service.id)} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <ServiceCard service={service} timeScale={timeScale} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}