import { Service } from "@shared/schema";
import { ServiceCard } from "./service-card";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface ServiceListProps {
  services: Service[];
}

export function ServiceList({ services }: ServiceListProps) {
  const { user } = useAuth();
  const [orderedServices, setOrderedServices] = useState(() => {
    // Create a sorted array considering NSFW content and user's custom order
    const sortedServices = [...services].sort((a, b) => {
      // If user has admin/superadmin role, respect their custom order or fall back to alphabetical
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        if (user?.service_order?.length) {
          const orderMap = new Map(user.service_order.map((id, index) => [id, index]));
          const orderA = orderMap.get(a.id) ?? Infinity;
          const orderB = orderMap.get(b.id) ?? Infinity;
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      }

      // For regular users, push NSFW content to the end
      if (a.isNSFW && !b.isNSFW) return 1;
      if (!a.isNSFW && b.isNSFW) return -1;

      // If both are NSFW or both are not NSFW, use user's custom order or alphabetical
      if (user?.service_order?.length) {
        const orderMap = new Map(user.service_order.map((id, index) => [id, index]));
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      }

      return a.name.localeCompare(b.name);
    });

    return sortedServices;
  });

  // Add state for admin controls visibility
  const [showAdminControls, setShowAdminControls] = useState(true);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Add keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdmin && e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowAdminControls(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
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
                    className={`transition-all duration-200 ${
                      snapshot.isDragging ? "scale-105 rotate-2 z-50" : ""
                    }`}
                  >
                    <ServiceCard 
                      service={service} 
                      isDragging={snapshot.isDragging} 
                      showAdminControls={showAdminControls}
                    />
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