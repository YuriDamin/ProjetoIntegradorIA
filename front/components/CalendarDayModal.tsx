"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/types/kanban";

interface Props {
  open: boolean;
  onClose: () => void;
  dateLabel: string;
  tasks: Card[];
}

export default function CalendarDayModal({ open, onClose, dateLabel, tasks }: Props) {
  function highlightCard(cardId: string) {
    window.location.href = "/"; 
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("highlight-card", { detail: cardId }));
    }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#0f172a] text-white border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Tarefas de {dateLabel}
          </DialogTitle>
        </DialogHeader>

        {tasks.length === 0 ? (
          <p className="text-slate-400">Nenhuma tarefa agendada.</p>
        ) : (
          <div className="space-y-3 mt-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="
                  p-4 rounded-xl border border-white/10 bg-white/5 
                  hover:bg-white/10 transition cursor-pointer
                "
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-slate-400">
                      {task.description || "Sem descrição"}
                    </p>

                    {task.assignee && (
                      <p className="text-xs text-slate-300 mt-1">
                        👤 Responsável: {task.assignee}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 mt-1">
                      Coluna: <span className="text-emerald-300">{task.columnId}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => highlightCard(task.id)}
                    className="
                      text-xs px-3 py-1 rounded-lg 
                      bg-emerald-600 hover:bg-emerald-500 
                      text-white shadow
                    "
                  >
                    Ver no Board →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
