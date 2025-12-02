"use client";

import { LogOut, User, Calendar, LayoutGrid } from "lucide-react";

interface TopbarProps {
  userName: string;
  onLogout: () => void;
}

export default function Topbar({ userName, onLogout }: TopbarProps) {
  return (
    <header
      className="
        w-full mb-10
        bg-white/5 backdrop-blur-xl
        border border-white/10
        shadow-lg
        rounded-2xl
        px-8 py-4
        flex items-center justify-between
        transition-all
      "
    >
      {/* Esquerda: Título + Botões */}
      <div className="flex items-center gap-6">
        <h1 className="text-white text-xl font-semibold tracking-wide">
          Meu Kanban
        </h1>

        {/* Botão Kanban + ícone */}
        <a
          href="/board"
          className="
            flex items-center gap-2
            px-4 py-2 rounded-xl
            bg-white/10 hover:bg-white/20
            text-white text-sm font-medium
            border border-white/10
            transition
          "
        >
          <LayoutGrid size={18} />
          Kanban
        </a>

        {/* Botão Calendário + ícone */}
        <a
          href="/calendar"
          className="
            flex items-center gap-2
            px-4 py-2 rounded-xl
            bg-white/10 hover:bg-white/20
            text-white text-sm font-medium
            border border-white/10
            transition
          "
        >
          <Calendar size={18} />
          Calendário
        </a>
      </div>

      {/* Direita: User + Logout */}
      <div className="flex items-center gap-5">
        {/* User Box */}
        <div
          className="
            flex items-center gap-3
            px-3 py-2
            rounded-xl
            bg-white/10
            border border-white/10
            hover:bg-white/20
            transition
          "
        >
          <User className="text-white/80" size={20} />
          <span className="text-white font-medium text-sm">{userName}</span>
        </div>

        {/* Botão Logout */}
        <button
          onClick={onLogout}
          className="
            flex items-center gap-2
            bg-red-600 hover:bg-red-500
            text-white font-medium
            px-4 py-2
            rounded-xl
            transition
            shadow-lg
          "
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </header>
  );
}
