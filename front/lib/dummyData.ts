import { BoardData } from "@/types/kanban";

export const initialData: BoardData = {
  columns: {
    todo: {
      id: "todo",
      title: "A Fazer",
      cards: [
        {
          id: "1",
          title: "Configurar projeto",
          description: "Configurar Next + TS",
          priority: "alta",
          deadline: "2025-11-27", 
          estimatedHours: 2,
          workedHours: 0,
          assignee: "Vitor",
          labels: ["setup", "frontend"],
          status: "backlog",
          checklist: [],
        },
        {
          id: "2",
          title: "Criar layout",
          description: "Montar design no Figma",
          priority: "media",
          deadline: null,
          estimatedHours: 3,
          workedHours: 0,
          assignee: null,
          labels: ["design"],
          status: "backlog",
          checklist: [],
        },
      ],
    },
    doing: {
      id: "doing",
      title: "Em Progresso",
      cards: [
        {
          id: "3",
          title: "Criar componentes",
          description: "Criar componentes base",
          priority: "alta",
          deadline: "2025-11-28",
          estimatedHours: 4,
          workedHours: 1,
          assignee: "Vitor",
          labels: ["frontend"],
          status: "doing",
          checklist: [],
        },
      ],
    },
    done: {
      id: "done",
      title: "Concluído",
      cards: [],
    },
  },
  columnOrder: ["todo", "doing", "done"],
};
