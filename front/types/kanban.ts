export type Priority = "baixa" | "media" | "alta" | "urgente";

export type Status = "backlog" | "doing" | "review" | "done";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;  
  status: Status;
  deadline: string | null;
  estimatedHours: number | null;
  workedHours: number;
  assignee: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  columnId: string;
}

export interface Column {
  id: string;
  title: string;
  cards: Card[];
}

export interface BoardData {
  columns: Record<string, Column>;
  columnOrder: string[];
}
