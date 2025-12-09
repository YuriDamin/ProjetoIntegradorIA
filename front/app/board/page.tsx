"use client";

import { useEffect, useState } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { io } from "socket.io-client";

import KanbanColumn from "@/components/KanbanColumn";
import EditCardModal from "@/components/EditCardModal";
import ChatbotButton from "@/components/ChatbotButton";
import Topbar from "@/components/Topbar";
import SearchResultsModal from "@/components/SearchResultsModal";
import WelcomeScreen from "@/components/WelcomeScreen";
import { Loader2 } from "lucide-react";

import { BoardData, Card, Column, Status } from "@/types/kanban";

export default function BoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Search & Stats Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [searchTitle, setSearchTitle] = useState("");

  const [userName, setUserName] = useState("Usuário");

  // 🔹 Pegando usuário do localStorage
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

  // 🔹 Carregar dados do board
  async function loadBoard() {
    console.log("🔥 Carregando dados do board...");
    try {
      setLoading(true);
      const res = await fetch("/api/columns", { credentials: "include" });

      if (!res.ok) {
        if (res.status === 401) {
          // 401 means token is invalid/expired. Clear it to prevent middleware redirect loop.
          document.cookie = "token=; path=/; max-age=0";
          window.location.href = "/login";
          return;
        }
        throw new Error("Falha ao carregar dados do board");
      }

      const json = (await res.json()) as BoardData;
      setData(json);
    } catch (err) {
      console.error("Erro ao carregar board:", err);
      // Optional: Start empty or show error UI
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Carregamento inicial
  useEffect(() => {
    loadBoard();
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:3001", {
      withCredentials: true,
    });

    socket.on("board-updated", () => {
      if (window.chatbotOpen) return;
      loadBoard();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 🔹 Atualização via IA — board-update event
  useEffect(() => {
    function handleChatbotUpdate() {
      console.log("🔥 EVENTO RECEBIDO DO CHATBOT");
      loadBoard();
    }

    window.addEventListener("board-update", handleChatbotUpdate);
    return () =>
      window.removeEventListener("board-update", handleChatbotUpdate);
  }, []);

  // 🔹 Helper functions for Search
  function getAllCards(): Card[] {
    if (!data) return [];
    return Object.values(data.columns).flatMap((col) => col.cards);
  }

  function handleSearchClick() {
    handleSearch("");
    setSearchModalOpen(true);
  }

  function handleSearch(term: string) {
    // Show all cards if term is empty
    if (!term.trim()) {
      setSearchResults(getAllCards());
      setSearchTitle("Todas as Tarefas");
      setSearchModalOpen(true);
      return;
    }

    const all = getAllCards();
    const lower = term.toLowerCase();
    const filtered = all.filter(c =>
      c.title.toLowerCase().includes(lower) ||
      c.description?.toLowerCase().includes(lower) ||
      c.labels?.some(l => l.toLowerCase().includes(lower))
    );
    setSearchResults(filtered);
    setSearchTitle(`Resultados para: "${term}"`);
    setSearchModalOpen(true);
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
    // We do NOT shift timezone for deadline, we treat the date part as absolute user identifier.
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
        if (!c.deadline) return false;
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

  // 🔹 Abrir modal
  function onCardClick(card: Card, columnId: string) {
    setSelectedCard(card);
    setSelectedColumn(columnId as unknown as Column);
    setModalOpen(true);
  }

  // 🔹 Criar card
  async function handleAddCard(columnId: string, title: string) {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, columnId }),
    });

    const newCard = (await res.json()) as Card;

    if (!data) return;

    const updated = {
      ...data,
      columns: {
        ...data.columns,
        [columnId]: {
          ...data.columns[columnId],
          cards: [...data.columns[columnId].cards, newCard],
        },
      },
    };

    setData(updated);
  }

  // 🔹 Editar card
  async function handleSaveCard(updatedCard: Card) {
    await fetch(`/api/cards/${updatedCard.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedCard),
    });

    if (!data || !selectedColumn) return;

    const colId = String(selectedColumn);

    const updated = {
      ...data,
      columns: {
        ...data.columns,
        [colId]: {
          ...data.columns[colId],
          cards: data.columns[colId].cards.map((c) =>
            c.id === updatedCard.id ? updatedCard : c
          ),
        },
      },
    };

    setData(updated);
  }

  // 🔹 Excluir card
  async function handleDeleteCard(cardId: string) {
    await fetch(`/api/cards/${cardId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!data || !selectedColumn) return;
    const colId = String(selectedColumn);

    const updated = {
      ...data,
      columns: {
        ...data.columns,
        [colId]: {
          ...data.columns[colId],
          cards: data.columns[colId].cards.filter((c) => c.id !== cardId),
        },
      },
    };

    setData(updated);
    setModalOpen(false);
  }

  // 🔹 Mapear status
  function mapStatus(columnId: string): Status {
    if (columnId === "doing") return "doing";
    if (columnId === "done") return "done";
    return "backlog";
  }

  // 🔹 Drag and Drop
  async function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination || !data) return;

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const movedCard = data.columns[sourceColId].cards[source.index];

    // Atualizar backend
    await fetch(`/api/cards/${movedCard.id}/move`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        toColumn: destColId,
        status: mapStatus(destColId),
      }),
    });

    // Atualizar frontend
    const updated: BoardData = JSON.parse(JSON.stringify(data));

    const [removed] = updated.columns[sourceColId].cards.splice(
      source.index,
      1
    );

    updated.columns[destColId].cards.splice(destination.index, 0, {
      ...removed,
      columnId: destColId,
      status: mapStatus(destColId),
    });

    setData(updated);
  }

  // 🔹 Logout
  function handleLogout() {
    document.cookie = "token=; path=/; max-age=0";
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <>
      <WelcomeScreen userName={userName} />

      {(loading || !data) ? (
        <div className="min-h-screen flex items-center justify-center text-white text-xl">
          <Loader2 className="animate-spin mr-3" />
          Carregando board...
        </div>
      ) : (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-[#050816] via-[#0A1224] to-[#020617] flex flex-col">
          <div className="flex-shrink-0 p-6 pb-0">
            <Topbar
              userName={userName}
              onLogout={handleLogout}
              onSearchClick={handleSearchClick}
              onStatClick={handleStatClick}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-x-hidden">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex h-full gap-8 p-6 w-full items-start justify-center">
                {data.columnOrder.map((colId) => (
                  <div key={colId} className="h-full flex-1">
                    <KanbanColumn
                      column={data.columns[colId]}
                      cards={data.columns[colId].cards}
                      onAddCard={handleAddCard}
                      onCardClick={onCardClick}
                    />
                  </div>
                ))}
              </div>
            </DragDropContext>

            <EditCardModal
              open={modalOpen}
              card={selectedCard}
              onClose={() => setModalOpen(false)}
              onSave={handleSaveCard}
              onDelete={handleDeleteCard}
            />

            <SearchResultsModal
              open={searchModalOpen}
              onClose={() => setSearchModalOpen(false)}
              title={searchTitle}
              cards={searchResults}
              onCardClick={(card) => {
                setSearchModalOpen(false);
                // Find column
                const colId = card.columnId;
                onCardClick(card, colId);
              }}
              onSearchChange={handleSearch}
            />
          </div>
        </div>
      )}

      <ChatbotButton />
    </>
  );
}
