"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { BoardData, Card } from "@/types/kanban";
import CalendarDayModal from "@/components/CalendarDayModal";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function getMonthMatrix(currentDate: Date): Date[][] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); 

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekDay = firstDayOfMonth.getDay();

  const matrix: Date[][] = [];
  let current = new Date(year, month, 1 - startWeekDay);

  for (let week = 0; week < 6; week++) {
    const row: Date[] = [];
    for (let day = 0; day < 7; day++) {
      row.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    matrix.push(row);
  }

  return matrix;
}

function dateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarPage() {
  const [userName, setUserName] = useState("Usuário");
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<BoardData | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [filterColumn, setFilterColumn] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Card[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = useState("");

  useEffect(() => {
    const hasToken = document.cookie.includes("token=");
    if (!hasToken) {
      window.location.href = "/login";
      return;
    }

    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserName(parsed.name ?? "Usuário");
      } catch {
        setUserName("Usuário");
      }
    }
  }, []);

  async function loadBoard() {
    try {
      setLoading(true);
      const res = await fetch("/api/columns", { credentials: "include" });
      const json = (await res.json()) as BoardData;
      setBoard(json);
    } catch (err) {
      console.error("Erro ao carregar board (calendar):", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    if (!destination || !board) return;

    const fromDate = source.droppableId; 
    const toDate = destination.droppableId; 

    if (fromDate === toDate) return;

    let foundColumnId: string | null = null;

    for (const colId of board.columnOrder) {
      const col = board.columns[colId];
      const found = col.cards.find((c) => c.id === draggableId);
      if (found) {
        foundColumnId = colId;
        break;
      }
    }

    if (!foundColumnId) return;

    try {
      await fetch(`/api/cards/${draggableId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deadline: toDate,
        }),
      });
    } catch (err) {
      console.error("Erro ao atualizar deadline:", err);
    }

    setBoard((prev) => {
      if (!prev || !foundColumnId) return prev;

      const col = prev.columns[foundColumnId];

      const updatedColumn = {
        ...col,
        cards: col.cards.map((c) =>
          c.id === draggableId ? { ...c, deadline: toDate } : c
        ),
      };

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [foundColumnId]: updatedColumn,
        },
      };
    });
  }

  if (loading || !board) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl">
        Carregando calendário...
      </div>
    );
  }

  const uniqueAssignees = Array.from(
    new Set(
      board.columnOrder.flatMap((colId) =>
        board.columns[colId].cards.map((c) => c.assignee).filter(Boolean)
      )
    )
  ) as string[];

  const tasksByDate: Record<string, Card[]> = {};

  board.columnOrder.forEach((colId) => {
    board.columns[colId].cards
      .filter((card) => {
        if (filterColumn && card.columnId !== filterColumn) return false;
        if (filterStatus && card.status !== filterStatus) return false;
        if (filterAssignee && card.assignee !== filterAssignee) return false;
        return true;
      })
      .forEach((card) => {
        if (!card.deadline) return;

        let key = "";
        if (typeof card.deadline === "string") {
          key = card.deadline.substring(0, 10);
        } else if ((card.deadline as any) instanceof Date) {
          key = dateKey(card.deadline);
        } else {
          key = String(card.deadline).substring(0, 10);
        }

        if (!tasksByDate[key]) tasksByDate[key] = [];
        tasksByDate[key].push(card);
      });
  });


  const month = currentDate.getMonth();
  const todayKey = dateKey(new Date());
  const monthMatrix = getMonthMatrix(currentDate);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function goPrevMonth() {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  }

  function goNextMonth() {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  }

  function openDayModal(day: Date) {
    const key = dateKey(day);
    const list = tasksByDate[key] ?? [];

    setSelectedTasks(list);
    setSelectedDateLabel(
      day.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    );
    setModalOpen(true);
  }

  function handleLogout() {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#0A1224] to-[#020617] p-6">
      {/* Topbar */}
      <Topbar userName={userName} onLogout={handleLogout} />

      <div className="max-w-6xl mx-auto mt-10 space-y-6 text-white">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendário de Tarefas</h1>
            <p className="text-slate-300 text-sm mt-1">
              Visualize e arraste as tarefas entre os dias para alterar o
              deadline.
            </p>
          </div>

          {/* Navegação de meses */}
          <div className="flex items-center gap-4">
            <button
              onClick={goPrevMonth}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 text-sm"
            >
              ← Mês anterior
            </button>

            <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold">
              {formatMonthYear(currentDate)}
            </div>

            <button
              onClick={goNextMonth}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 text-sm"
            >
              Próximo mês →
            </button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap items-center gap-6 p-4 bg-white/5 border border-white/10 rounded-xl">
          {/* Coluna */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Coluna:</label>
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-lg text-sm"
            >
              <option value="">Todas</option>
              <option value="backlog">Backlog</option>
              <option value="doing">Em andamento</option>
              <option value="done">Concluído</option>
            </select>
          </div>

          {/* Status interno */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-lg text-sm"
            >
              <option value="">Todos</option>
              <option value="backlog">Backlog</option>
              <option value="doing">Em andamento</option>
              <option value="review">Em revisão</option>
              <option value="done">Finalizado</option>
            </select>
          </div>

          {/* Responsável */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Responsável:</label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-lg text-sm"
            >
              <option value="">Todos</option>
              {uniqueAssignees.map((resp) => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-200">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="py-2 bg-white/5 rounded-lg border border-white/10"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Grade do mês com Drag & Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-7 gap-2">
            {monthMatrix.map((week, wi) =>
              week.map((day, di) => {
                const key = dateKey(day);
                const tasks = tasksByDate[key] || [];

                const isCurrentMonth = day.getMonth() === month;
                const isToday = key === todayKey;

                const baseClasses =
                  "min-h-[120px] rounded-xl p-2 border flex flex-col bg-white/5 transition-all cursor-pointer";

                const borderColor = isToday
                  ? "border-yellow-400"
                  : isCurrentMonth
                  ? "border-white/15"
                  : "border-white/5";

                const bgColor =
                  isCurrentMonth ? "bg-white/10" : "bg-white/5 opacity-60";

                return (
                  <Droppable droppableId={key} key={`${wi}-${di}`}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        onClick={() => openDayModal(day)}
                        className={`${baseClasses} ${borderColor} ${bgColor}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-semibold ${
                              isCurrentMonth ? "text-white" : "text-slate-400"
                            }`}
                          >
                            {day.getDate()}
                          </span>

                          {isToday && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
                              Hoje
                            </span>
                          )}
                        </div>

                        {/* Tarefas do dia (Draggable) */}
                        <div className="space-y-1 mt-1 overflow-hidden">
                          {tasks.map((task, index) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const d = new Date(`${key}T00:00:00`);

                            let dot = "bg-emerald-500";
                            if (d < today) dot = "bg-red-500";
                            if (key === todayKey) dot = "bg-yellow-400";

                            return (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                              >
                                {(dragProvided, snapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`
                                      flex items-center gap-2 px-2 py-1 text-[11px]
                                      bg-black/30 border border-white/10 rounded-lg
                                      truncate transition-all
                                      ${
                                        snapshot.isDragging
                                          ? "scale-105 bg-white/20 shadow-lg"
                                          : ""
                                      }
                                    `}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full ${dot}`}
                                    />
                                    <span className="truncate">
                                      {task.title}
                                    </span>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}

                          {tasks.length === 0 && (
                            <span className="text-[10px] text-slate-500">
                              — sem tarefas —
                            </span>
                          )}

                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })
            )}
          </div>
        </DragDropContext>
      </div>

      {/* Modal de detalhes do dia */}
      <CalendarDayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dateLabel={selectedDateLabel}
        tasks={selectedTasks}
      />
    </div>
  );
}
