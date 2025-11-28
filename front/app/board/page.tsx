"use client";

import { useEffect, useState } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { io } from "socket.io-client";

import KanbanColumn from "@/components/KanbanColumn";
import EditCardModal from "@/components/EditCardModal";
import ChatbotButton from "@/components/ChatbotButton";
import Topbar from "@/components/Topbar";

import { BoardData, Card, ColumnId, Status } from "@/types/kanban";

export default function BoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<ColumnId | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [userName, setUserName] = useState("Usuário");

  useEffect(() => {
    const hasToken = document.cookie.includes("token=");
    if (!hasToken) {
      window.location.href = "/login";
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

      const res = await fetch("/api/columns", {
        credentials: "include",
      });

      const json = (await res.json()) as BoardData;
      setData(json);
    } catch (err) {
      console.error("Erro ao carregar board:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:3001", {
      withCredentials: true,
    });

    socket.on("board-updated", () => {
      loadBoard();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  function onCardClick(card: Card, columnId: string) {
    setSelectedCard(card);
    setSelectedColumn(columnId as ColumnId);
    setModalOpen(true);
  }

  async function handleAddCard(columnId: string, title: string) {
    const colId = columnId as ColumnId;

    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, columnId: colId }),
    });

    const newCard = (await res.json()) as Card;

    if (!data) return;

    const updated: BoardData = {
      ...data,
      columns: {
        ...data.columns,
        [colId]: {
          ...data.columns[colId],
          cards: [...data.columns[colId].cards, newCard],
        },
      },
    };

    setData(updated);
  }

  async function handleSaveCard(updatedCard: Card) {
    await fetch(`/api/cards/${updatedCard.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedCard),
    });

    if (!data || !selectedColumn) return;

    const colId = selectedColumn;

    const updated: BoardData = {
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

  async function handleDeleteCard(cardId: string) {
    await fetch(`/api/cards/${cardId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!data || !selectedColumn) return;

    const colId = selectedColumn;

    const updated: BoardData = {
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

  function mapStatus(columnId: ColumnId): Status {
    if (columnId === "doing") return "doing";
    if (columnId === "done") return "done";
    return "backlog";
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination || !data) return;

    const sourceColId = source.droppableId as ColumnId;
    const destColId = destination.droppableId as ColumnId;

    const movedCard = data.columns[sourceColId].cards[source.index];

    await fetch(`/api/cards/${movedCard.id}/move`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        toColumn: destColId,
        status: mapStatus(destColId),
      }),
    });

    const updated: BoardData = { ...data };

    updated.columns[sourceColId] = {
      ...updated.columns[sourceColId],
      cards: [...updated.columns[sourceColId].cards],
    };

    const [removed] = updated.columns[sourceColId].cards.splice(
      source.index,
      1
    );

    const updatedCard: Card = {
      ...removed,
      columnId: destColId,
      status: mapStatus(destColId),
    };

    updated.columns[destColId] = {
      ...updated.columns[destColId],
      cards: [...updated.columns[destColId].cards],
    };

    updated.columns[destColId].cards.splice(destination.index, 0, updatedCard);

    setData(updated);
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#0A1224] to-[#020617] p-6">

      <Topbar userName={userName} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto mt-10 space-y-8">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-8 justify-center flex-wrap pb-8">
            {data.columnOrder.map((colId) => (
              <KanbanColumn
                key={colId}
                column={data.columns[colId]}
                cards={data.columns[colId].cards}
                onAddCard={handleAddCard}
                onCardClick={onCardClick}
              />
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

      <ChatbotButton />
    </div>
  );
}
