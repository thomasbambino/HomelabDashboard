import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { ServiceCard } from "./service-card";
import { Service } from "@shared/schema";

interface SortableServiceCardProps {
  service: Service;
  timeScale: string;
}

export function SortableServiceCard({ service, timeScale }: SortableServiceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <ServiceCard service={service} timeScale={timeScale} />
    </div>
  );
}
