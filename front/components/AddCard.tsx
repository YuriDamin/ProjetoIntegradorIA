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
        <div className="space-y-2">
          <Input
            placeholder="Título do cartão..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/80 border-white/40 text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="text-xs">
              Adicionar
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-700"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-100/80 hover:bg-white/10 text-xs"
          size="sm"
          onClick={() => setOpen(true)}
        >
          + Adicionar cartão
        </Button>
      )}
    </div>
  );
}
