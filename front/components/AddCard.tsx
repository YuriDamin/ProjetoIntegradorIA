"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddCardProps {
  onAdd: (title: string) => void;
}

export default function AddCard({ onAdd }: AddCardProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function handleSave() {
    if (!title.trim()) return;
    onAdd(title);
    setTitle("");
    setOpen(false);
  }

  return (
    <div className="mt-3">
      {open ? (
        <div
          className="
            space-y-3 p-3 rounded-xl
            bg-white/10
            border border-white/20 shadow-lg
            transition-all
          "
        >
          <Input
            placeholder="Título do cartão..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="
              bg-white/20 border-white/30 text-white placeholder:text-white/60
              shadow-inner
            "
          />

          <div className="flex gap-2 justify-end">
            <Button
              onClick={handleSave}
              size="sm"
              className="text-xs bg-emerald-500 hover:bg-emerald-400"
            >
              Criar
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="
                text-xs text-slate-200 
                hover:bg-white/10 
                transition
              "
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="
            w-full text-left text-xs
            px-3 py-2
            rounded-lg
            text-slate-200
            bg-white/5
            hover:bg-white/10
            border border-white/10
            transition
          "
        >
          + Adicionar cartão
        </button>
      )}
    </div>
  );
}
