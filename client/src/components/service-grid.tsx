import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { ServiceCard } from "./service-card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ServiceGridProps {
  timeScale: string;
}

export function ServiceGrid({ timeScale }: ServiceGridProps) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 50,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const orderMutation = useMutation({
    mutationFn: async (serviceIds: number[]) => {
      await apiRequest("POST", "/api/services/order", { serviceIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Order updated",
        description: "Service order has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(Number(active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === Number(active.id));
      const newIndex = services.findIndex((s) => s.id === Number(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(services, oldIndex, newIndex);
        orderMutation.mutate(newOrder.map((s) => s.id));
      }
    }
  };

  const activeService = services.find((service) => service.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={services.map(service => service.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              timeScale={timeScale}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId && activeService && (
          <ServiceCard
            service={activeService}
            timeScale={timeScale}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}