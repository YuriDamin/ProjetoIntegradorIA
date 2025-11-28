"use client";

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import AddCard from "./AddCard";
import { Column, Card } from "@/types/kanban";

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
        bg-[#ffffff12] 
        backdrop-blur-sm 
        p-5 
        rounded-2xl 
        shadow-lg 
        border border-white/10
        flex flex-col
      "
    >
      <h2 className="text-white/90 font-semibold text-sm tracking-wider mb-4 uppercase">
        {column.title}
      </h2>

      <Droppable droppableId={column.id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="min-h-[40px] flex-1"
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

      <AddCard onAdd={(title) => onAddCard(column.id, title)} />
    </div>
  );
}
