"use client";

import { LogOut, User, Calendar, Plus } from "lucide-react";

interface TopbarProps {
  userName: string;
  onLogout: () => void;
  onCalendarClick?: () => void;
  onAddTask?: () => void;
  currentPage?: 'board' | 'calendar';
}

export default function Topbar({ 
  userName, 
  onLogout, 
  onCalendarClick,
  onAddTask,
  currentPage = 'board'
}: TopbarProps) {
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
        Kanbanize
      </h1>

      {/* ÁREA DE AÇÕES E USUÁRIO */}
      <div className="flex items-center gap-5">
        {/* Botão Nova Tarefa */}
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="
              flex items-center gap-2
              bg-green-600 hover:bg-green-500
              text-white font-medium
              px-4 py-2
              rounded-xl
              transition
              shadow-lg
            "
          >
            <Plus size={18} />
            Nova Tarefa
          </button>
        )}

        {/* Botão Calendário - Sempre visível no Board */}
        {currentPage === 'board' && onCalendarClick && (
          <button
            onClick={onCalendarClick}
            className="
              flex items-center gap-2
              bg-blue-600 hover:bg-blue-500
              text-white font-medium
              px-4 py-2
              rounded-xl
              transition
              shadow-lg
            "
          >
            <Calendar size={18} />
            Calendário
          </button>
        )}

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