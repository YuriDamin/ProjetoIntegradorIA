"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { BoardData, Card } from "@/types/kanban";
import CalendarDayModal from "@/components/CalendarDayModal";
import EditCardModal from "@/components/EditCardModal";
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

  const [editingCard, setEditingCard] = useState<Card | null>(null);

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
  const unscheduledTasks: Card[] = [];

  board.columnOrder.forEach((colId) => {
    board.columns[colId].cards
      .filter((card) => {
        if (filterColumn && card.columnId !== filterColumn) return false;
        if (filterStatus && card.status !== filterStatus) return false;
        if (filterAssignee && card.assignee !== filterAssignee) return false;
        return true;
      })
      .forEach((card) => {
        if (!card.deadline) {
          unscheduledTasks.push(card);
          return;
        }

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

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    if (!destination || !board) return;

    const fromDate = source.droppableId;
    const toDate = destination.droppableId;

    if (fromDate === toDate) return;

    // Find card column
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

    // Logic: if toDate === "unscheduled", deadline = null
    const newDeadline = toDate === "unscheduled" ? null : toDate;

    try {
      await fetch(`/api/cards/${draggableId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deadline: newDeadline,
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
          c.id === draggableId ? { ...c, deadline: newDeadline } : c
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

  async function handleSaveCard(updated: Card) {
    try {
      await fetch(`/api/cards/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      loadBoard();
    } catch (err) {
      console.error("Erro ao salvar card:", err);
    }
  }

  async function handleDeleteCard(id: string) {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await fetch(`/api/cards/${id}`, { method: "DELETE" });
      loadBoard();
    } catch (err) {
      console.error("Erro ao excluir card:", err);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#050816] via-[#0A1224] to-[#020617] flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <Topbar userName={userName} onLogout={handleLogout} />
      </div>

      {/* Main Layout Grid: Full Width now */}
      <div className="flex-1 w-full px-6 mt-4 pb-6 min-h-0 flex flex-col lg:flex-row gap-6 text-white overflow-hidden">

        <DragDropContext onDragEnd={handleDragEnd}>
          {/* SIDEBAR: Filters + Unscheduled */}
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

            {/* FILTERS moved to Sidebar */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-200">Filtros</h3>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Coluna:</label>
                <select
                  value={filterColumn}
                  onChange={(e) => setFilterColumn(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded text-sm w-full"
                >
                  <option className="text-black" value="">Todas</option>
                  <option className="text-black" value="backlog">Backlog</option>
                  <option className="text-black" value="doing">Em andamento</option>
                  <option className="text-black" value="done">Concluído</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded text-sm w-full"
                >
                  <option className="text-black" value="">Todos</option>
                  <option className="text-black" value="backlog">Backlog</option>
                  <option className="text-black" value="doing">Em andamento</option>
                  <option className="text-black" value="review">Em revisão</option>
                  <option className="text-black" value="done">Finalizado</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Responsável:</label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded text-sm w-full"
                >
                  <option className="text-black" value="">Todos</option>
                  {uniqueAssignees.map((resp) => (
                    <option className="text-black" key={resp} value={resp}>
                      {resp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unscheduled Tasks */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex-1 flex flex-col min-h-0">
              <h3 className="text-sm font-bold mb-2 text-slate-200">Sem Data</h3>
              <p className="text-[10px] text-slate-400 mb-2">Arraste para agendar</p>

              <Droppable droppableId="unscheduled">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[100px]"
                  >
                    {unscheduledTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`
                              p-2 rounded-lg border border-white/10 bg-slate-800/50 text-xs shadow-sm
                              ${snapshot.isDragging ? "ring-2 ring-blue-500 opacity-90" : "hover:bg-slate-700/50"}
                            `}
                          >
                            <div className="font-semibold text-slate-200 truncate">{task.title}</div>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                              <span>{task.columnId}</span>
                              {task.priority && <span>{task.priority}</span>}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {unscheduledTasks.length === 0 && (
                      <div className="text-center text-xs text-slate-500 mt-4">Vazio</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          {/* Calendar Area */}
          <div className="flex-1 flex flex-col space-y-4 h-full min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Calendário</h1>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={goPrevMonth}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 text-sm"
                >
                  ← Anterior
                </button>

                <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold min-w-[140px] text-center">
                  {formatMonthYear(currentDate)}
                </div>

                <button
                  onClick={goNextMonth}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 text-sm"
                >
                  Próximo →
                </button>
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

            <div className="grid grid-cols-7 grid-rows-6 gap-2 flex-1 h-full min-h-0">
              {monthMatrix.map((week, wi) =>
                week.map((day, di) => {
                  const key = dateKey(day);
                  const tasks = tasksByDate[key] || [];
                  const isCurrentMonth = day.getMonth() === month;
                  const isToday = key === todayKey;

                  const baseClasses =
                    "h-full rounded-xl p-1 border flex flex-col bg-white/5 transition-all cursor-pointer overflow-hidden";

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
                              className={`text-xs font-semibold ${isCurrentMonth ? "text-white" : "text-slate-400"
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

                          <div className="space-y-1 mt-1 overflow-hidden">
                            {tasks.slice(0, 1).map((task, index) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const d = new Date(`${key}T00:00:00`);

                              let dot = "bg-emerald-500";
                              if (d < today) dot = "bg-red-500";
                              if (key === todayKey) dot = "bg-yellow-400";
                              if (task.status === "done") dot = "bg-slate-500";

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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCard(task);
                                      }}
                                      className={`
                                        flex items-center gap-2 px-2 py-1 text-[11px]
                                        bg-black/30 border border-white/10 rounded-lg
                                        truncate transition-all hover:bg-white/10
                                        ${snapshot.isDragging
                                          ? "scale-105 bg-white/20 shadow-lg"
                                          : ""
                                        }
                                      `}
                                    >
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                                      <span className="truncate">{task.title}</span>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}

                            {tasks.length > 1 && (
                              <div className="flex items-center gap-1 pl-1 mt-1">
                                <span className="flex items-center justify-center bg-white/10 border border-white/10 rounded-full w-5 h-5 text-[10px] text-slate-300 font-bold">
                                  +{tasks.length - 1}
                                </span>
                              </div>
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
          </div>
        </DragDropContext>
      </div>

      <CalendarDayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dateLabel={selectedDateLabel}
        tasks={selectedTasks}
        onTaskClick={(task) => {
          setModalOpen(false); // Close day modal first
          setEditingCard(task); // Open edit modal
        }}
      />

      <EditCardModal
        open={!!editingCard}
        card={editingCard}
        onClose={() => setEditingCard(null)}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
      />
    </div>
  );
}
