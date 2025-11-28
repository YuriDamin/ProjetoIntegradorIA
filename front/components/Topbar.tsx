"use client";

import { LogOut, User } from "lucide-react";

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
      <h1 className="text-white text-xl font-semibold tracking-wide">
        Meu Kanban
      </h1>

      {/* ÁREA DO USUÁRIO */}
      <div className="flex items-center gap-5">

        {/* Informações do usuário */}
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
          <span className="text-white font-medium text-sm">
            {userName}
          </span>
        </div>

        {/* Botão de sair */}
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
