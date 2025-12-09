"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { BoardData, Card } from "@/types/kanban";
import CalendarDayModal from "@/components/CalendarDayModal";
import EditCardModal from "@/components/EditCardModal";
import SearchResultsModal from "@/components/SearchResultsModal";
import ChatbotButton from "@/components/ChatbotButton";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


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

function getWeekMatrix(currentDate: Date): Date[][] {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Go to Sunday

  const row: Date[] = [];
  const current = new Date(startOfWeek);

  for (let i = 0; i < 7; i++) {
    row.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return [row];
}

function getAgendaDays(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function dateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [userName, setUserName] = useState("Usuário");
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<BoardData | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  // Picker States
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'year' | 'month'>('year');
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [filterColumn, setFilterColumn] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  // Search & Stats Modal logic
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [searchTitle, setSearchTitle] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Card[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  // Confirm Move State
  const [pendingMove, setPendingMove] = useState<{
    cardId: string;
    newDate: string; // YYYY-MM-DD
    newDateLabel: string;
    oldDeadline: string | Date | null | undefined;
    sourceId: string;
    originalColumnId: string;
  } | null>(null);


  // Stats Refresher
  const [statsTick, setStatsTick] = useState(0);

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
    // Initial load triggers stats
    setStatsTick(prev => prev + 1);
  }, []);

  async function loadBoard() {
    try {
      setLoading(true);
      const res = await fetch("/api/columns", { credentials: "include" });
      const json = (await res.json()) as BoardData;
      setBoard(json);
      setStatsTick(prev => prev + 1);
    } catch (err) {
      console.error("Erro ao carregar board (calendar):", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  function getAllCards(): Card[] {
    if (!board) return [];
    return board.columnOrder.flatMap((colId) => board.columns[colId].cards);
  }

  function handleSearchClick() {
    handleSearch("");
    setSearchModalOpen(true);
  }

  function handleSearch(term: string) {
    const all = getAllCards();

    if (!term.trim()) {
      setSearchResults(all);
      setSearchTitle("Pesquisar Tarefas");
      return;
    }
    const lower = term.toLowerCase();
    const filtered = all.filter(c =>
      c.title.toLowerCase().includes(lower) ||
      c.description?.toLowerCase().includes(lower) ||
      c.labels?.some(l => l.toLowerCase().includes(lower))
    );
    setSearchResults(filtered);
    setSearchTitle(`Resultados para: "${term}"`);
  }

  function handleStatClick(type: 'overdue' | 'dueSoon' | 'onTrack') {
    const all = getAllCards();

    // Today in Brasilia Time
    const getPtBRDate = (d: Date) => {
      return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    };
    const todayStr = getPtBRDate(new Date());

    let filtered: Card[] = [];
    let title = "";

    // Helper: get YYYY-MM-DD from deadline (assuming ISO/UTC string in db)
    const getCardDate = (c: Card) => {
      if (!c.deadline) return "";
      return c.deadline.toString().substring(0, 10);
    };

    if (type === 'overdue') {
      title = "Tarefas Atrasadas";
      filtered = all.filter(c => {
        if (!c.deadline || c.status === 'done') return false;
        const cDateStr = getCardDate(c);
        return cDateStr < todayStr;
      });
    } else if (type === 'dueSoon') {
      title = "Tarefas para Hoje";
      filtered = all.filter(c => {
        if (!c.deadline || c.status === 'done') return false;
        const cDateStr = getCardDate(c);
        return cDateStr === todayStr;
      });
    } else if (type === 'onTrack') {
      title = "Tarefas Futuras";
      filtered = all.filter(c => {
        if (c.status === 'done') return false;
        if (!c.deadline) return true;
        const cDateStr = getCardDate(c);
        return cDateStr > todayStr;
      });
    }

    filtered.sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return da - db;
    });

    setSearchResults(filtered);
    setSearchTitle(title);
    setSearchModalOpen(true);
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
  const unscheduledTasks: Card[] = [];

  // Filter tasks for CALENDAR VIEW (not search, search is now modal)
  board.columnOrder.forEach((colId) => {
    board.columns[colId].cards
      .filter((card) => {
        if (filterColumn && card.columnId !== filterColumn) return false;
        if (filterPriority && card.priority !== filterPriority) return false;
        if (filterAssignee && card.assignee !== filterAssignee) return false;
        // NOTE: Search filter removed call to modal
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

  function handlePrev() {
    setCurrentDate((prev) => {
      if (viewMode === 'week') {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      }
      // Month or Agenda -> Prev Month
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  }

  function handleNext() {
    setCurrentDate((prev) => {
      if (viewMode === 'week') {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      }
      // Month or Agenda -> Next Month
      return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function openPicker() {
    setPickerYear(currentDate.getFullYear());
    setPickerMode('year');
    setIsPickerOpen(true);
  }

  function handleYearSelect(year: number) {
    setPickerYear(year);
    setPickerMode('month');
  }

  function handleMonthSelect(monthIndex: number) {
    setCurrentDate(new Date(pickerYear, monthIndex, 1));
    setIsPickerOpen(false);
  }

  function openDayModal(day: Date) {
    const key = dateKey(day);
    setSelectedDateKey(key);
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

  // DnD Handlers
  function onDragStart() {
    // Always retract sidebar on drag start to reveal calendar
    setIsDragging(true);
  }

  async function handleDragEnd(result: DropResult) {
    setIsDragging(false);
    const { destination, source, draggableId } = result;

    if (!destination || !board) return;

    let fromDate = source.droppableId;
    const toDate = destination.droppableId;

    if (fromDate.startsWith("SIDEBAR_")) {
      fromDate = fromDate.replace("SIDEBAR_", "");
    }

    if (fromDate === toDate) return;

    // Find card column and object
    let foundColumnId: string | null = null;
    let foundCard: Card | null = null;

    for (const colId of board.columnOrder) {
      const col = board.columns[colId];
      const found = col.cards.find((c) => c.id === draggableId);
      if (found) {
        foundColumnId = colId;
        foundCard = found;
        break;
      }
    }
    if (!foundColumnId || !foundCard) return;

    // Logic: if toDate === "unscheduled", deadline = null
    const newDeadlineStr = toDate === "unscheduled" ? null : toDate;

    // CONFIRMATION STEP
    const dateObj = newDeadlineStr ? new Date(newDeadlineStr + "T12:00:00") : null;
    const label = dateObj
      ? dateObj.toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })
      : "Sem Data";

    // Optimistic Update First (Visual feedback)
    updateBoardState(draggableId, foundColumnId, newDeadlineStr);

    // Remove from sidebar list visually if dragged out
    if (modalOpen && source.droppableId.startsWith("SIDEBAR_")) {
      setSelectedTasks(prev => prev.filter(c => c.id !== draggableId));
    }

    // Set Pending State for Dialog
    setPendingMove({
      cardId: draggableId,
      newDate: newDeadlineStr || "",
      newDateLabel: label,
      oldDeadline: foundCard.deadline,
      sourceId: source.droppableId,
      originalColumnId: foundColumnId
    });
  }

  async function handleConfirmMove() {
    if (!pendingMove) return;
    const { cardId, newDate } = pendingMove;

    // API Call to finalize
    try {
      await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deadline: newDate,
        }),
      });
      // Update local state is already done optimistically
    } catch (err) {
      console.error("Erro ao confirmar movimento:", err);
      handleCancelMove(); // Revert on error
    }
    setPendingMove(null);
  }

  function handleCancelMove() {
    if (!pendingMove) return;
    const { cardId, oldDeadline, originalColumnId, sourceId } = pendingMove;

    // Revert Board State
    // Convert oldDeadline to string YYYY-MM-DD if needed, or null
    let oldDeadlineStr: string | null = null;
    if (typeof oldDeadline === 'string') oldDeadlineStr = oldDeadline.substring(0, 10);
    else if (oldDeadline instanceof Date) oldDeadlineStr = dateKey(oldDeadline);

    updateBoardState(cardId, originalColumnId, oldDeadlineStr);

    // Restore to sidebar if needed
    if (sourceId.startsWith("SIDEBAR_")) {
      // We need to find the card object again to add it back to selectedTasks
      const col = board?.columns[originalColumnId];
      const card = col?.cards.find(c => c.id === cardId);
      if (card) {
        setSelectedTasks(prev => [...prev, card]);
      }
    }
    setPendingMove(null);
  }

  // Helper to update board locally
  function updateBoardState(cardId: string, columnId: string, newDeadline: string | null) {
    setBoard((prev) => {
      if (!prev) return prev;
      const col = prev.columns[columnId];
      const updatedCards = col.cards.map((c) =>
        c.id === cardId ? { ...c, deadline: newDeadline } : c
      );
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [columnId]: { ...col, cards: updatedCards },
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
        <Topbar
          userName={userName}
          onLogout={handleLogout}
          onSearchClick={handleSearchClick}
          onStatClick={handleStatClick}
          refreshTrigger={statsTick}
        />
      </div>

      {/* Main Layout Grid: Full Width now */}
      <div className="flex-1 w-full px-6 mt-4 pb-6 min-h-0 flex flex-col lg:flex-row gap-6 text-white overflow-hidden">

        <DragDropContext onDragStart={onDragStart} onDragEnd={handleDragEnd}>
          {/* SIDEBAR: Filters + Unscheduled */}
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

            {/* FILTERS moved to Sidebar */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-200">Filtros</h3>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Status (Coluna):</label>
                <select
                  value={filterColumn}
                  onChange={(e) => setFilterColumn(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded text-sm w-full"
                >
                  <option className="text-black" value="">Todos</option>
                  <option className="text-black" value="backlog">Backlog</option>
                  <option className="text-black" value="doing">Em andamento</option>
                  <option className="text-black" value="review">Em revisão</option>
                  <option className="text-black" value="done">Concluído</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Prioridade:</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded text-sm w-full"
                >
                  <option className="text-black" value="">Todas</option>
                  <option className="text-black" value="urgente">Urgente</option>
                  <option className="text-black" value="alta">Alta</option>
                  <option className="text-black" value="media">Média</option>
                  <option className="text-black" value="baixa">Baixa</option>
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
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-20">
              {isPickerOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsPickerOpen(false)}
                />
              )}

              <div className="flex items-center gap-6">
                <h1 className="text-3xl font-bold">Calendário</h1>

                <div className="relative flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 z-50">
                  <button
                    onClick={handlePrev}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                  >
                    ←
                  </button>

                  <div
                    onClick={openPicker}
                    className="px-2 py-1 cursor-pointer min-w-[140px] text-center select-none group"
                  >
                    <span className="text-sm font-semibold capitalize group-hover:text-blue-400 transition-colors flex items-center justify-center gap-2">
                      {formatMonthYear(currentDate)}
                      <span className="text-[10px] opacity-50">▼</span>
                    </span>
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                  >
                    →
                  </button>

                  <button
                    onClick={goToToday}
                    className="ml-2 px-3 py-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-lg text-xs font-bold hover:bg-yellow-400/20 transition-colors"
                  >
                    Hoje
                  </button>

                  {isPickerOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-[#0F172A] border border-white/20 rounded-xl shadow-2xl p-4 w-64 cursor-default animate-in fade-in zoom-in-95 duration-200">
                      {pickerMode === 'year' && (
                        <>
                          <div className="text-center text-xs text-slate-400 mb-2">Selecione o Ano</div>
                          <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const y = pickerYear - 4 + i;
                              return (
                                <button
                                  key={y}
                                  onClick={(e) => { e.stopPropagation(); handleYearSelect(y); }}
                                  className={`p-2 rounded text-sm transition-colors ${y === pickerYear ? 'bg-blue-600 text-white font-bold' : 'hover:bg-white/10 text-slate-300'}`}
                                >
                                  {y}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                      {pickerMode === 'month' && (
                        <>
                          <div className="flex items-center justify-between mb-2 px-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPickerMode('year'); }}
                              className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              ← {pickerYear}
                            </button>
                            <span className="text-xs text-slate-400">Selecione o Mês</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const date = new Date(pickerYear, i, 1);
                              const name = date.toLocaleDateString("pt-BR", { month: 'short' }).toUpperCase().replace('.', '');
                              const isActive = i === currentDate.getMonth() && pickerYear === currentDate.getFullYear();
                              return (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); handleMonthSelect(i); }}
                                  className={`p-2 rounded text-xs font-bold transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-300'}`}
                                >
                                  {name}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 z-50">
                {(['month', 'week', 'agenda'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`
                      px-4 py-1.5 text-xs font-medium rounded-md transition-all
                      ${viewMode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                  >
                    {m === 'month' ? 'Mês' : m === 'week' ? 'Semana' : 'Agenda'}
                  </button>
                ))}
              </div>
            </div>

            {/* Cabeçalho dos dias da semana */}
            {/* Cabeçalho dos dias da semana (Only Grid) */}
            {viewMode !== 'agenda' && (
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
            )}

            {/* GRID VIEW (Month / Week) */}
            {viewMode !== 'agenda' && (
              <div className={`grid grid-cols-7 gap-2 flex-1 min-h-0 ${viewMode === 'week' ? 'grid-rows-1' : 'grid-rows-6'}`}>
                {(viewMode === 'week' ? getWeekMatrix(currentDate) : monthMatrix).map((week, wi) =>
                  week.map((day, di) => {
                    const key = dateKey(day);
                    const tasks = tasksByDate[key] || [];
                    const isCurrentMonth = day.getMonth() === month;
                    const isToday = key === todayKey;

                    // Week view always shows full brightness
                    const dim = !isCurrentMonth && viewMode === 'month';

                    const baseClasses =
                      "h-full rounded-xl p-1 border flex flex-col bg-white/5 transition-all cursor-pointer hover:bg-white/10";

                    const borderColor = isToday
                      ? "border-yellow-400"
                      : "border-white/10";

                    const bgColor = dim ? "bg-white/5 opacity-40 text-slate-500" : "bg-white/10 text-white";

                    return (
                      <Droppable droppableId={key} key={`${wi}-${di}`}>
                        {(provided, snapshot) => {
                          const isOver = snapshot.isDraggingOver;
                          const bgColor = isOver
                            ? "bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50 scale-[1.02] z-10 shadow-xl"
                            : (dim ? "bg-white/5 opacity-40 text-slate-500" : "bg-white/10 text-white");

                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              onClick={() => openDayModal(day)}
                              className={`${baseClasses} ${borderColor} ${bgColor}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold px-1">
                                  {day.getDate()}
                                </span>
                                <div className="flex items-center gap-1">
                                  {tasks.length > 0 && (
                                    <span className="flex items-center justify-center bg-blue-500/20 border border-blue-500/30 rounded px-1.5 h-4 text-[9px] text-blue-200 font-bold">
                                      {tasks.length}
                                    </span>
                                  )}
                                  {isToday && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1 mt-1 flex-1 relative overflow-hidden">
                                {tasks.slice(0, viewMode === 'week' ? 10 : 3).map((task, index) => {
                                  // Task Dot Logic
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
                                            flex items-center gap-2 px-2 py-1 text-[10px]
                                            bg-black/40 border border-white/5 rounded-md
                                            truncate transition-all hover:bg-white/10
                                            ${snapshot.isDragging ? "z-50 shadow-xl scale-105 bg-slate-800" : ""}
                                          `}
                                        >
                                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                                          <span className="truncate opacity-90">{task.title}</span>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                                {tasks.length > (viewMode === 'week' ? 10 : 3) && (
                                  <div className="text-[9px] text-center text-slate-500">
                                    +{tasks.length - (viewMode === 'week' ? 10 : 3)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      </Droppable>
                    );
                  })
                )}
              </div>
            )}

            {/* AGENDA VIEW */}
            {viewMode === 'agenda' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0 bg-black/20 rounded-xl p-2">
                {getAgendaDays(currentDate).map((day) => {
                  const key = dateKey(day);
                  const tasks = tasksByDate[key] || [];
                  const isToday = key === todayKey;

                  return (
                    <Droppable droppableId={key} key={key}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`
                                   flex gap-4 p-4 rounded-xl border transition-colors min-h-[80px]
                                   ${isToday ? 'bg-yellow-400/5 border-yellow-400/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}
                                `}
                        >
                          <div className="flex flex-col items-center justify-center w-16 flex-shrink-0 border-r border-white/10 pr-4">
                            <span className="text-2xl font-bold text-slate-200">{day.getDate()}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400">
                              {weekDays[day.getDay()]}
                            </span>
                          </div>

                          <div className="flex-1 space-y-2">
                            {tasks.length === 0 && (
                              <div className="text-xs text-slate-600 italic py-2">Sem tarefas</div>
                            )}
                            {tasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(dragProvided) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    onClick={() => setEditingCard(task)}
                                    className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/5 hover:border-white/20 group cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                      <span className="text-sm text-slate-200 group-hover:text-white">{task.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {task.priority && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
                                          {task.priority}
                                        </span>
                                      )}
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                                        {task.columnId}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            )}
          </div>
          <CalendarDayModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            dateLabel={selectedDateLabel}
            tasks={selectedTasks}
            droppableId={`SIDEBAR_${selectedDateKey}`}
            isDragging={isDragging}
            onTaskClick={(task) => {
              setModalOpen(false);
              setEditingCard(task);
            }}
          />
        </DragDropContext>
      </div>

      <EditCardModal
        open={!!editingCard}
        card={editingCard}
        onClose={() => setEditingCard(null)}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
      />

      <SearchResultsModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title={searchTitle}
        cards={searchResults}
        onCardClick={(task) => {
          setSearchModalOpen(false);
          setEditingCard(task);
        }}
        onSearchChange={handleSearch}
      />
      <Dialog open={!!pendingMove} onOpenChange={() => handleCancelMove()}>
        <DialogContent className="bg-[#1e293b] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Confirmar Reagendamento</DialogTitle>
            <DialogDescription className="text-slate-400">
              Mover tarefa para <strong>{pendingMove?.newDateLabel}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleCancelMove}
              className="px-4 py-2 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmMove}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
            >
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ChatbotButton />
    </div>
  );
}
