"use client";

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import AddCard from "./AddCard";
import { Card } from "@/types/kanban";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

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

type SortOption = "manual" | "deadline" | "priority" | "title";

export default function KanbanColumn({
  column,
  cards,
  onAddCard,
  onCardClick,
}: ColumnProps) {
  const [sortBy, setSortBy] = useState<SortOption>("manual");

  // Sort Logic
  const sortedCards = [...cards].sort((a, b) => {
    if (sortBy === "deadline") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "priority") {
      const pOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
      const pa = pOrder[a.priority as keyof typeof pOrder] ?? 2;
      const pb = pOrder[b.priority as keyof typeof pOrder] ?? 2;
      return pa - pb;
    }
    return 0; // manual (indexes from parent)
  });

  // Decide which list to use (if manual, strictly use original preserve index for DnD accuracy)
  // Actually, for display, we use sorted. DnD might be weird if sorted but user can switch back to manual.
  const displayCards = sortBy === "manual" ? cards : sortedCards;

  return (
    <div
      className="
        w-full min-w-[300px]
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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <h2 className="text-white/80 font-bold text-base tracking-wide uppercase">
          {column.title}
        </h2>

        {/* Sort Controls */}
        <div className="relative group">
          <button className="p-1 hover:bg-white/10 rounded-md transition text-slate-400 hover:text-white" title="Ordenar">
            <ArrowUpDown size={14} />
          </button>

          {/* Dropdown on hover/focus (CSS based for simplicity or standard select) */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="absolute right-0 top-0 opacity-0 w-8 h-8 cursor-pointer"
            title="Ordenar por..."
          >
            <option value="manual">Manual</option>
            <option value="deadline">Prazo</option>
            <option value="priority">Prioridade</option>
            <option value="title">Nome</option>
          </select>
        </div>
      </div>

      {/* Botão de adicionar card (AGORA NO TOPO) */}
      <div className="mb-4">
        <AddCard onAdd={(title) => onAddCard(column.id, title)} />
      </div>

      {/* Área de drop */}
      <Droppable droppableId={column.id} isDropDisabled={sortBy !== "manual"}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              min-h-[50px]
              flex-1
              space-y-4
              transition-all
              overflow-y-auto
              pr-2
              ${sortBy !== "manual" ? "opacity-90" : ""}
            `}
          >
            {displayCards.map((card, index) => (
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
