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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

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
      setShowDeleteConfirmation(false);
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
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="
            max-w-xl h-[85vh] flex flex-col p-0 gap-0
            bg-slate-900/95 backdrop-blur-xl
            border border-white/10 
            shadow-2xl
            text-white
            rounded-2xl
            overflow-hidden
          "
        >
          <div className="p-6 pb-2 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Editar cartão
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-2 flex-1 overflow-y-auto custom-scrollbar">
            {/* Título */}
            <Input
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="
                bg-white/10 border-white/20
                text-white placeholder:text-white/50
              "
            />

            {/* Descrição */}
            <Textarea
              placeholder="Descrição"
              className="
                min-h-[100px]
                bg-white/10 border-white/20
                text-white placeholder:text-white/50
              "
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Prioridade e Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Prioridade
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="
                    w-full px-2 py-1 rounded-md
                    bg-white/10 border border-white/20
                    text-white text-sm
                  "
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="
                    w-full px-2 py-1 rounded-md
                    bg-white/10 border border-white/20
                    text-white text-sm
                  "
                >
                  <option value="backlog">Backlog</option>
                  <option value="doing">Em andamento</option>
                  <option value="review">Em revisão</option>
                  <option value="done">Finalizado</option>
                </select>
              </div>
            </div>

            {/* Deadline e responsável */}
            <div className="grid grid-cols-2 gap-4">
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
                  className="
                    bg-white/10 border-white/20
                    text-white
                  "
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Responsável
                </label>
                <Input
                  value={assignee}
                  placeholder="Nome da pessoa"
                  onChange={(e) => setAssignee(e.target.value)}
                  className="
                    bg-white/10 border-white/20
                    text-white
                  "
                />
              </div>
            </div>

            {/* Estimativa e horas trabalhadas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Estimativa (h)
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
                  className="
                    bg-white/10 border-white/20
                    text-white
                  "
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Tempo trabalhado (h)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={workedHours}
                  onChange={(e) => setWorkedHours(Number(e.target.value) || 0)}
                  className="
                    bg-white/10 border-white/20
                    text-white
                  "
                />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-semibold mb-1">
                Labels (separadas por vírgula)
              </label>
              <Input
                value={labels}
                placeholder="ex: frontend, urgente"
                onChange={(e) => setLabels(e.target.value)}
                className="
                  bg-white/10 border-white/20
                  text-white
                "
              />
            </div>

            {/* Progresso */}
            {totalItems > 0 && (
              <div className="space-y-1 mt-4">
                <div className="flex justify-between text-xs text-white/80">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>

                <Progress
                  value={progress}
                  className="h-2 rounded-full bg-slate-800 [&>div]:bg-emerald-400"
                />
              </div>
            )}

            {/* Checklist */}
            <div>
              <div className="flex justify-between items-center mb-2 mt-3">
                <span className="text-xs font-semibold">Checklist</span>

                <Button
                  size="sm"
                  onClick={handleAddChecklistItem}
                  className="
                    bg-transparent border border-white/30 text-white text-xs
                    hover:bg-white/10
                  "
                >
                  + Item
                </Button>
              </div>

              {checklist.length === 0 && (
                <p className="text-xs text-white/60">
                  Nenhum item. Clique em “+ Item” para adicionar.
                </p>
              )}

              <div className="space-y-3 max-h-48 overflow-auto pr-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="
                      flex items-center gap-3
                      bg-white/5
                      px-4 py-3 rounded-xl
                      border border-white/10
                      shadow
                      transition-all
                      hover:bg-white/10 hover:border-white/20
                    "
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleChecklistToggle(item.id)}
                      className="
                        size-4 rounded-md cursor-pointer
                        border border-white/40
                        bg-white/10
                        checked:bg-emerald-500 checked:border-emerald-500
                      "
                    />

                    <Input
                      value={item.text}
                      placeholder="Descrição do item"
                      onChange={(e) =>
                        handleChecklistTextChange(item.id, e.target.value)
                      }
                      className="
                        flex-1 bg-transparent border-none shadow-none
                        text-white placeholder:text-white/50
                        focus-visible:ring-0
                      "
                    />

                    <button
                      onClick={() => handleChecklistRemove(item.id)}
                      className="
                        text-red-400 hover:text-red-300
                        p-2 rounded-md hover:bg-red-500/20
                      "
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botões finais - Footer Fixo */}
          <div className="p-6 pt-4 border-t border-white/10 bg-black/20 shrink-0 flex justify-between">
            <Button
              onClick={handleSave}
              className="
                bg-emerald-500 hover:bg-emerald-400
                text-white
              "
            >
              Salvar
            </Button>

            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirmation(true)}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão - Popup Separado */}
      <Dialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
      >
        <DialogContent className="max-w-sm bg-slate-900 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Excluir tarefa?</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-300">
            Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser
            desfeita.
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirmation(false)}
              className="text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => card && onDelete(card.id)}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
