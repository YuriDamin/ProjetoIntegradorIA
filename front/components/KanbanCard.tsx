"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Card as CardType } from "@/types/kanban";
import { Progress } from "@/components/ui/progress";
import DnDPortal from "@/components/DnDPortal";

interface CardProps {
  card: CardType;
  index: number;
  onClick: (card: CardType) => void;
}

export default function KanbanCard({ card, index, onClick }: CardProps) {
  const totalItems = card.checklist.length;
  const completedItems = card.checklist.filter((i) => i.done).length;
  const progress =
    totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  const priorityConfig: Record<
    string,
    { color: string; icon: string; bg: string }
  > = {
    urgente: {
      color: "text-red-700",
      bg: "bg-red-100",
      icon: "⛔",
    },
    alta: {
      color: "text-orange-700",
      bg: "bg-orange-100",
      icon: "🔥",
    },
    media: {
      color: "text-blue-700",
      bg: "bg-blue-100",
      icon: "⏫",
    },
    baixa: {
      color: "text-slate-600",
      bg: "bg-slate-100",
      icon: "⬇️",
    },
  };

  const normalized = card.priority?.toLowerCase?.() ?? "media";
  const priority = priorityConfig[normalized] ?? priorityConfig["media"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let deadlineDate: Date | null = null;
  let deadlineText = "";
  let deadlineColor = "text-slate-600";
  let deadlineBadge = "bg-slate-100";
  let deadlineIcon = "📅";

  if (card.deadline) {
    const raw = card.deadline.toString().substring(0, 10);

    deadlineDate = new Date(`${raw}T00:00:00`);

    if (!isNaN(deadlineDate.getTime())) {
      deadlineText = deadlineDate.toLocaleDateString("pt-BR");

      const diffDays =
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays < 0) {
        deadlineColor = "text-red-700";
        deadlineBadge = "bg-red-100";
        deadlineIcon = "⚠️";
      } else if (diffDays === 0) {
        deadlineColor = "text-amber-700";
        deadlineBadge = "bg-amber-100";
        deadlineIcon = "⏳";
      } else if (diffDays <= 2) {
        deadlineColor = "text-orange-700";
        deadlineBadge = "bg-orange-100";
        deadlineIcon = "🔥";
      }
    }
  }

  function renderCard(provided: any) {
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        onClick={() => onClick(card)}
        className="
          bg-white 
          rounded-xl 
          p-4 
          shadow-lg 
          hover:shadow-xl 
          transition-all 
          cursor-pointer 
          border border-gray-200
          mb-4
        "
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-800 text-sm">
            {card.title}
          </h3>

          <div
            className={`
              inline-flex items-center gap-1 
              text-[10px] px-2 py-1 rounded-full 
              font-semibold border
              ${priority.bg} ${priority.color}
            `}
          >
            {priority.icon} <span className="uppercase">{card.priority}</span>
          </div>
        </div>

        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {card.labels.map((label) => (
              <span
                key={label}
                className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {card.description && (
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
            {card.description}
          </p>
        )}

        {deadlineDate && (
          <div className="flex items-center gap-1 mt-3 text-[11px]">
            <span
              className={`px-2 py-0.5 rounded-full ${deadlineBadge} ${deadlineColor} font-medium`}
            >
              {deadlineIcon} {deadlineText}
            </span>
          </div>
        )}

        {totalItems > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>
                {completedItems}/{totalItems} itens
              </span>
              <span>{progress}%</span>
            </div>
            <Progress
              value={progress}
              className="h-1.5 rounded-full bg-slate-200 [&>div]:bg-emerald-500"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => {
        if (!snapshot.isDragging) return renderCard(provided);

        return <DnDPortal>{renderCard(provided)}</DnDPortal>;
      }}
    </Draggable>
  );
}
