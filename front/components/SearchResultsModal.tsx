"use client";

import { X, Search } from "lucide-react";
import { Card } from "@/types/kanban";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

interface SearchResultsModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    cards: Card[];
    onCardClick: (card: Card) => void;
    onSearchChange?: (term: string) => void;
    initialSearchTerm?: string;
}

export default function SearchResultsModal({
    open,
    onClose,
    title,
    cards,
    onCardClick,
    onSearchChange,
    initialSearchTerm = ""
}: SearchResultsModalProps) {
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

    // Update local state when initial term changes (e.g. reopening)
    useEffect(() => {
        setSearchTerm(initialSearchTerm);
    }, [initialSearchTerm]);

    if (!open) return null;

    // Helper to render card exactly like KanbanCard
    const renderCard = (card: Card) => {
        const totalItems = card.checklist?.length || 0;
        const completedItems = card.checklist?.filter((i) => i.done).length || 0;
        const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

        const priorityConfig: Record<string, { color: string; icon: string; bg: string }> = {
            urgente: { color: "text-red-400", bg: "bg-red-500/20 border-red-500/40", icon: "⛔" },
            alta: { color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/40", icon: "🔥" },
            media: { color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/40", icon: "⏫" },
            baixa: { color: "text-slate-300", bg: "bg-slate-500/20 border-slate-500/40", icon: "⬇️" },
        };

        const normalized = card.priority?.toLowerCase?.() ?? "media";
        const priority = priorityConfig[normalized] ?? priorityConfig["media"];

        // Today at midnight
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let deadlineDate: Date | null = null;
        let deadlineText = "";
        let deadlineColor = "text-slate-300";
        let deadlineBadge = "bg-slate-600/20 border-slate-500/30";
        let deadlineIcon = "📅";

        if (card.deadline) {
            // Force local date interpretation (strip time, assume midnight local)
            const raw = card.deadline.toString().substring(0, 10);
            deadlineDate = new Date(`${raw}T00:00:00`);

            if (!isNaN(deadlineDate.getTime())) {
                deadlineText = deadlineDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

                // Diff in days
                const diffTime = deadlineDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    deadlineColor = "text-red-400";
                    deadlineBadge = "bg-red-500/20 border-red-500/30";
                    deadlineIcon = "🔥";
                } else if (diffDays === 0) {
                    deadlineColor = "text-yellow-400";
                    deadlineBadge = "bg-yellow-500/20 border-yellow-500/30";
                    deadlineIcon = "⚠️";
                } else {
                    deadlineColor = "text-blue-400";
                    deadlineBadge = "bg-blue-500/20 border-blue-500/30";
                    deadlineIcon = "📅";
                }
            }
        }

        return (
            <div
                key={card.id}
                onClick={() => onCardClick(card)}
                className="
          bg-white/5
          rounded-xl
          p-4
          mb-3
          border border-white/10
          shadow-sm
          cursor-pointer
          transition-all
          hover:shadow-md hover:bg-white/10 hover:border-white/20
          group
        "
            >
                {/* Header: Title & Priority */}
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white/90 text-sm group-hover:text-white transition-colors">
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
                {card.labels && card.labels.length > 0 && (
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

                {/* Description */}
                {card.description && (
                    <p className="text-xs text-slate-300/80 mt-1 line-clamp-2">
                        {card.description}
                    </p>
                )}

                {/* Deadline */}
                {deadlineDate && (
                    <div
                        className={`
              inline-flex items-center gap-1 mt-3 text-[11px] px-2 py-1 rounded-md border 
              ${deadlineBadge} ${deadlineColor}
            `}
                    >
                        {deadlineIcon} {deadlineText}
                    </div>
                )}

                {/* Checklist Progress */}
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
                            className="h-1.5 rounded-full bg-slate-800 [&>div]:bg-emerald-400"
                        />
                    </div>
                )}

                {/* Assignee / Column Info (Extra info useful for list view) */}
                {!deadlineDate && !totalItems && (
                    <div className="mt-2 text-[10px] text-slate-500 flex gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 uppercase">{card.columnId}</span>
                        {card.assignee && <span>👤 {card.assignee}</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] w-full max-w-2xl max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header with Search Input */}
                <div className="flex flex-col border-b border-white/10 bg-white/5">
                    <div className="flex items-center justify-between p-4 pb-2">
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search Input Area */}
                    {onSearchChange && (
                        <div className="px-4 pb-4">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Digite para pesquisar tarefas..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        onSearchChange(e.target.value);
                                    }}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-2 flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {cards.length === 0 ? (
                        <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-3">
                            <Search size={40} className="text-slate-700" />
                            <p>Nenhuma tarefa encontrada.</p>
                        </div>
                    ) : (
                        cards.map(renderCard)
                    )}
                </div>
            </div>
        </div>
    );
}
