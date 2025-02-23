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

interface ServiceGridProps {
  timeScale: string;
}

export function ServiceGrid({ timeScale }: ServiceGridProps) {
  const { toast } = useToast();
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // Reduced from 8 to make dragging easier to initiate
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === Number(active.id));
      const newIndex = services.findIndex((s) => s.id === Number(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(services, oldIndex, newIndex);
        orderMutation.mutate(newOrder.map((s) => s.id));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        <SortableContext 
          items={services.map(s => s.id)} 
          strategy={rectSortingStrategy}
        >
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              timeScale={timeScale}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}