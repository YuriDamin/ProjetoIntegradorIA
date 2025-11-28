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

  // ----------------------------
  // PRIORIDADE (mantido igual)
  // ----------------------------
  const priorityConfig: Record<
    string,
    { color: string; icon: string; bg: string }
  > = {
    urgente: {
      color: "text-red-400",
      bg: "bg-red-500/20 border-red-500/40",
      icon: "⛔",
    },
    alta: {
      color: "text-orange-400",
      bg: "bg-orange-500/20 border-orange-500/40",
      icon: "🔥",
    },
    media: {
      color: "text-blue-400",
      bg: "bg-blue-500/20 border-blue-500/40",
      icon: "⏫",
    },
    baixa: {
      color: "text-slate-300",
      bg: "bg-slate-500/20 border-slate-500/40",
      icon: "⬇️",
    },
  };

  const normalized = card.priority?.toLowerCase?.() ?? "media";
  const priority = priorityConfig[normalized] ?? priorityConfig["media"];

  // ----------------------------
  // DEADLINE (mantido igual)
  // ----------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let deadlineDate: Date | null = null;
  let deadlineText = "";
  let deadlineColor = "text-slate-300";
  let deadlineBadge = "bg-slate-600/20 border-slate-500/30";
  let deadlineIcon = "📅";

  if (card.deadline) {
    const raw = card.deadline.toString().substring(0, 10);
    deadlineDate = new Date(`${raw}T00:00:00`);

    if (!isNaN(deadlineDate.getTime())) {
      deadlineText = deadlineDate.toLocaleDateString("pt-BR");

      const diffDays =
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays < 0) {
        deadlineColor = "text-red-400";
        deadlineBadge = "bg-red-500/20 border-red-500/30";
        deadlineIcon = "⚠️";
      } else if (diffDays === 0) {
        deadlineColor = "text-yellow-400";
        deadlineBadge = "bg-yellow-500/20 border-yellow-500/30";
        deadlineIcon = "⏳";
      } else if (diffDays <= 2) {
        deadlineColor = "text-orange-400";
        deadlineBadge = "bg-orange-500/20 border-orange-500/30";
        deadlineIcon = "🔥";
      }
    }
  }

  // ----------------------------
  // RENDER CARD
  // ----------------------------
  function renderCard(provided: any) {
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        onClick={() => onClick(card)}
        className="
          bg-white/10
          backdrop-blur-lg
          rounded-xl
          p-4
          mb-4
          border border-white/10
          shadow-xl
          cursor-pointer
          transition-all
          hover:shadow-2xl hover:bg-white/20 hover:border-white/20
        "
      >
        {/* Título e prioridade */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white/90 text-sm">
            {card.title}
          </h3>

          <div
            className={`
              inline-flex items-center gap-1
              text-[10px] px-2 py-1 rounded-full font-semibold border
              ${priority.bg} ${priority.color}
            `}
          >
            {priority.icon}
            <span className="uppercase">{card.priority}</span>
          </div>
        </div>

        {/* Labels */}
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label) => (
              <span
                key={label}
                className="
                  text-[10px] px-2 py-0.5 rounded-full
                  bg-indigo-500/20 text-indigo-300 border border-indigo-400/20
                "
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Descrição */}
        {card.description && (
          <p className="text-xs text-slate-300/80 mt-1 line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Deadline */}
        {deadlineDate && (
          <div
            className={`
              flex items-center gap-1 mt-3 text-[11px] px-2 py-1 rounded-md border 
              ${deadlineBadge} ${deadlineColor}
            `}
          >
            {deadlineIcon} {deadlineText}
          </div>
        )}

        {/* Checklist */}
        {totalItems > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-300 mb-1">
              <span>
                {completedItems}/{totalItems} itens
              </span>
              <span>{progress}%</span>
            </div>

            <Progress
              value={progress}
              className="h-2 rounded-full bg-slate-800 [&>div]:bg-emerald-400"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) =>
        !snapshot.isDragging ? (
          renderCard(provided)
        ) : (
          <DnDPortal>{renderCard(provided)}</DnDPortal>
        )
      }
    </Draggable>
  );
}
