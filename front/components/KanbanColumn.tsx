"use client";

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import AddCard from "./AddCard";
import { Card } from "@/types/kanban";

interface Column {
  id: string;
  title: string;
}

interface ColumnProps {
  column: Column;
  cards: Card[];
  onAddCard: (columnId: string, title: string) => void;
  onCardClick: (card: Card, columnId: string) => void;
}

export default function KanbanColumn({
  column,
  cards,
  onAddCard,
  onCardClick,
}: ColumnProps) {
  return (
    <div
      className="
        w-80
        h-full max-h-full
        bg-gradient-to-br from-[#101826] to-[#0a0f19]
        backdrop-blur-sm
        p-5 
        rounded-2xl 
        shadow-xl 
        border border-white/10
        flex flex-col
        transition-all
        hover:shadow-2xl hover:scale-[1.01]
      "
    >
      {/* Título da coluna */}
      <h2 className="text-white/80 font-bold text-base tracking-wide mb-3 uppercase border-b border-white/10 pb-2">
        {column.title}
      </h2>

      {/* Botão de adicionar card (AGORA NO TOPO) */}
      <div className="mb-4">
        <AddCard onAdd={(title) => onAddCard(column.id, title)} />
      </div>

      {/* Área de drop */}
      <Droppable droppableId={column.id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="
              min-h-[50px]
              flex-1
              space-y-4
              transition-all
              overflow-y-auto
              pr-2
            "
          >
            {cards.map((card, index) => (
              <KanbanCard
                key={card.id}
                card={card}
                index={index}
                onClick={(c) => onCardClick(c, column.id)}
              />
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
