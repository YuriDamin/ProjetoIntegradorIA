export type Status = "backlog" | "doing" | "done";

export type ColumnId = "backlog" | "doing" | "done";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

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

  columnId: ColumnId;
}

export interface ColumnData {
  id: ColumnId;
  title: string;
  cards: Card[];
}

export interface BoardData {
  columnOrder: ColumnId[];
  columns: Record<ColumnId, ColumnData>;
}
