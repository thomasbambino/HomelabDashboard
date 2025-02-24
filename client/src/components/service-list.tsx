import { Service } from "@shared/schema";
import { ServiceCard } from "./service-card";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface ServiceListProps {
  services: Service[];
}

export function ServiceList({ services }: ServiceListProps) {
  const { user } = useAuth();
  const [orderedServices, setOrderedServices] = useState(() => {
    // If user has a custom order, use it, otherwise sort alphabetically
    if (user?.service_order?.length) {
      const orderMap = new Map(user.service_order.map((id, index) => [id, index]));
      return [...services].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
    }
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (serviceOrder: number[]) => {
      const res = await apiRequest("PATCH", "/api/user", { service_order: serviceOrder });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(orderedServices);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedServices(items);
    updateOrderMutation.mutate(items.map(service => service.id));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="services">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          >
            {orderedServices.map((service, index) => (
              <Draggable
                key={service.id}
                draggableId={String(service.id)}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`transition-transform duration-200 ${
                      snapshot.isDragging ? "scale-105 rotate-2 z-50" : ""
                    }`}
                  >
                    <ServiceCard service={service} />
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