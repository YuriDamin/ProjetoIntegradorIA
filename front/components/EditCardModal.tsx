"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { Card, ChecklistItem, Priority, Status } from "@/types/kanban";

interface Props {
  card: Card | null;
  open: boolean;
  onClose: () => void;
  onSave: (card: Card) => void;
  onDelete: (id: string) => void;
}

export default function EditCardModal({
  card,
  open,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [priority, setPriority] = useState<Priority>("media");
  const [status, setStatus] = useState<Status>("backlog");

  const [deadline, setDeadline] = useState<string | null>(null);

  const [estimatedHours, setEstimatedHours] = useState<number | null>(null);
  const [workedHours, setWorkedHours] = useState<number>(0);

  const [assignee, setAssignee] = useState<string>("");
  const [labels, setLabels] = useState<string>("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setPriority(card.priority);
      setStatus(card.status);

      if (card.deadline) {
        const clean = card.deadline.toString().substring(0, 10);
        setDeadline(clean);
      } else {
        setDeadline(null);
      }

      setEstimatedHours(card.estimatedHours);
      setWorkedHours(card.workedHours);
      setAssignee(card.assignee ?? "");
      setLabels(card.labels.join(", "));
      setChecklist(card.checklist);
    }
  }, [card, open]);

  function handleSave() {
    if (!card) return;

    const updated: Card = {
      ...card,
      title,
      description,
      priority,
      status,

      deadline: deadline ? deadline.substring(0, 10) : null,

      estimatedHours,
      workedHours,
      assignee: assignee.trim() === "" ? null : assignee.trim(),
      labels: labels
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
      checklist,
    };

    onSave(updated);
    onClose();
  }

  function handleAddChecklistItem() {
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: "",
      done: false,
    };
    setChecklist((prev) => [...prev, newItem]);
  }

  function handleChecklistTextChange(id: string, text: string) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  }

  function handleChecklistToggle(id: string) {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  }

  function handleChecklistRemove(id: string) {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  }

  const totalItems = checklist.length;
  const completedItems = checklist.filter((i) => i.done).length;
  const progress =
    totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-slate-950/90 text-slate-50 border border-slate-700/60">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Editar cartão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-900/80 border-slate-700 text-sm"
          />

          <Textarea
            placeholder="Descrição"
            className="min-h-[100px] bg-slate-900/80 border-slate-700 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Prioridade
              </label>
              <select
                className="w-full border border-slate-700 rounded-md px-2 py-1 text-sm bg-slate-900/80"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Status interno
              </label>
              <select
                className="w-full border border-slate-700 rounded-md px-2 py-1 text-sm bg-slate-900/80"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                <option value="backlog">Backlog</option>
                <option value="doing">Em andamento</option>
                <option value="review">Em revisão</option>
                <option value="done">Finalizado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Deadline
              </label>
              <Input
                type="date"
                value={deadline ?? ""}
                onChange={(e) =>
                  setDeadline(e.target.value === "" ? null : e.target.value)
                }
                className="bg-slate-900/80 border-slate-700 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Responsável
              </label>
              <Input
                placeholder="Nome da pessoa"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="bg-slate-900/80 border-slate-700 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Estimativa (horas)
              </label>
              <Input
                type="number"
                min={0}
                value={estimatedHours ?? ""}
                onChange={(e) =>
                  setEstimatedHours(
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className="bg-slate-900/80 border-slate-700 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Tempo trabalhado (horas)
              </label>
              <Input
                type="number"
                min={0}
                value={workedHours}
                onChange={(e) => setWorkedHours(Number(e.target.value) || 0)}
                className="bg-slate-900/80 border-slate-700 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Labels (separadas por vírgula)
            </label>
            <Input
              placeholder="ex: frontend, urgente, sprint 3"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="bg-slate-900/80 border-slate-700 text-sm"
            />
          </div>

          {totalItems > 0 && (
            <div className="space-y-1 mt-4">
              <div className="flex justify-between text-xs font-semibold text-slate-200">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress
                value={progress}
                className="h-2 rounded-full bg-slate-800 [&>div]:bg-emerald-500"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2 mt-3">
              <span className="text-xs font-semibold">Checklist</span>

              <Button
                type="button"
                size="sm"
                className="border border-slate-600 text-xs text-white bg-transparent hover:bg-slate-800"
                onClick={handleAddChecklistItem}
              >
                + Item
              </Button>
            </div>

            {checklist.length === 0 && (
              <p className="text-xs text-slate-400">
                Nenhum item. Clique em &quot;+ Item&quot; para adicionar.
              </p>
            )}

            <div className="space-y-3 max-h-48 overflow-auto pr-1">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="
                    flex items-center gap-3
                    bg-[#111827]/60
                    rounded-xl
                    px-4 py-3
                    border border-slate-700/40
                    shadow-[0_0_12px_rgba(0,0,0,0.15)]
                    transition-all
                    hover:border-emerald-600/40
                    hover:bg-[#1a2537]/60
                  "
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleChecklistToggle(item.id)}
                    className="
                      size-4 rounded-md
                      border border-slate-600
                      bg-slate-900/90
                      checked:bg-emerald-500 checked:border-emerald-500
                      transition-all cursor-pointer
                    "
                  />

                  <Input
                    className="
                      flex-1 text-sm bg-transparent border-none shadow-none
                      focus-visible:ring-0
                      placeholder:text-slate-400
                    "
                    placeholder="Descrição do item"
                    value={item.text}
                    onChange={(e) =>
                      handleChecklistTextChange(item.id, e.target.value)
                    }
                  />

                  <button
                    onClick={() => handleChecklistRemove(item.id)}
                    className="
                      text-red-400 hover:text-red-300
                      hover:bg-red-500/10
                      p-2 rounded-md transition
                    "
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              onClick={handleSave}
              className="bg-emerald-500 hover:bg-emerald-400"
            >
              Salvar
            </Button>

            <Button
              variant="destructive"
              onClick={() => card && onDelete(card.id)}
            >
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
