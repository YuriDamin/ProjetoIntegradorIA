import { create } from "zustand";
import { BoardData, Card } from "@/types/kanban";
import { initialData } from "@/lib/dummyData";

interface KanbanStore {
  data: BoardData;
  setData: (data: BoardData) => void;

  addCard: (columnId: string, card: Card) => void;
  updateCard: (columnId: string, card: Card) => void;
  deleteCard: (columnId: string, cardId: string) => void;

  findCard: (id: string) => { card: Card; columnId: string } | null;
}

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  data: initialData,

  setData: (data) => set({ data }),

  addCard: (columnId, card) =>
    set((state) => {
      const col = state.data.columns[columnId];
      return {
        data: {
          ...state.data,
          columns: {
            ...state.data.columns,
            [columnId]: {
              ...col,
              cards: [...col.cards, card],
            },
          },
        },
      };
    }),

  updateCard: (columnId, updatedCard) =>
    set((state) => {
      const col = state.data.columns[columnId];
      return {
        data: {
          ...state.data,
          columns: {
            ...state.data.columns,
            [columnId]: {
              ...col,
              cards: col.cards.map((c) =>
                c.id === updatedCard.id ? updatedCard : c
              ),
            },
          },
        },
      };
    }),

  deleteCard: (columnId, cardId) =>
    set((state) => {
      const col = state.data.columns[columnId];
      return {
        data: {
          ...state.data,
          columns: {
            ...state.data.columns,
            [columnId]: {
              ...col,
              cards: col.cards.filter((c) => c.id !== cardId),
            },
          },
        },
      };
    }),

  findCard: (id) => {
    const data = get().data;
    for (const columnId of data.columnOrder) {
      const column = data.columns[columnId];
      const card = column.cards.find((c) => c.id === id);
      if (card) return { card, columnId };
    }
    return null;
  },
}));
