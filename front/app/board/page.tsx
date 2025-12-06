"use client";

import { useEffect, useState } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { io } from "socket.io-client";

import KanbanColumn from "@/components/KanbanColumn";
import EditCardModal from "@/components/EditCardModal";
import ChatbotButton from "@/components/ChatbotButton";
import Topbar from "@/components/Topbar";

import { BoardData, Card, Column, Status } from "@/types/kanban";

export default function BoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
      const json = (await res.json()) as BoardData;
      setData(json);
    } catch (err) {
      console.error("Erro ao carregar board:", err);
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

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl">
        Carregando board...
      </div>
    );
  }

  console.log("🖼️ Renderizando BoardPage, data:", data);

  return (
    <>
      {/* 🔥 ESSA PARTE RE-RENDERIZA */}
      {/* 🔥 ESSA PARTE RE-RENDERIZA */}
      <div className="h-screen overflow-hidden bg-gradient-to-br from-[#050816] via-[#0A1224] to-[#020617] flex flex-col">
        <div className="flex-shrink-0 p-6 pb-0">
          <Topbar userName={userName} onLogout={handleLogout} />
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-8 p-6 min-w-max items-start">
              {data.columnOrder.map((colId) => (
                <div key={colId} className="h-full">
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
        </div>
      </div>

      {/* 🔥 ESSA PARTE NÃO RE-RENDERIZA — CHATBOT PERMANECE VIVO */}
      <ChatbotButton />
    </>
  );
}
