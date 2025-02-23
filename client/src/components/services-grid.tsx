import { useMemo } from "react";
import { Service } from "@shared/schema";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableServiceCard } from "./sortable-service-card";

interface ServicesGridProps {
  services: Service[];
  timeScale: string;
  onReorder?: (services: Service[]) => void;
}

export function ServicesGrid({ services, timeScale, onReorder }: ServicesGridProps) {
  // Initialize sensors for both mouse and touch interactions
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Start dragging after moving 10px
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Start dragging after touching for 250ms
        tolerance: 5,
      },
    })
  );

  // Get sorted ids for DnD context
  const items = useMemo(() => services.map((s) => s.id), [services]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);
      
      const newOrder = arrayMove(services, oldIndex, newIndex);
      onReorder?.(newOrder);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <SortableServiceCard
              key={service.id}
              service={service}
              timeScale={timeScale}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
