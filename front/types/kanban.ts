// Tipos de status usados no backend e frontend
export type Status = "backlog" | "doing" | "done";

// Tipos de colunas (iguais às IDs do banco)
export type ColumnId = "backlog" | "doing" | "done";

// Item de checklist
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

// Card completo
export interface Card {
  id: string;
  title: string;
  description: string;
  priority: "baixa" | "media" | "alta" | string;
  status: Status;
  deadline: string | null;
  estimatedHours: number | null;
  workedHours: number;
  assignee: string | null;
  labels: string[];
  checklist: ChecklistItem[];

  // 🔥 Campo que estava dando erro — tipado corretamente
  columnId: ColumnId;
}

// Coluna do board
export interface ColumnData {
  id: ColumnId;
  title: string;
  cards: Card[];
}

// Estrutura completa do board
export interface BoardData {
  columnOrder: ColumnId[];
  columns: Record<ColumnId, ColumnData>;
}
