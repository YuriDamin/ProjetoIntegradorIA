"use client";

import { LayoutDashboard, LogOut, Calendar as CalendarIcon, Search, Flame, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface TopbarProps {
  userName: string;
  onLogout: () => void;
  onSearchClick?: () => void;
  onStatClick?: (type: 'overdue' | 'dueSoon' | 'onTrack') => void;
}

export default function Topbar({ userName, onLogout, onSearchClick, onStatClick }: TopbarProps) {
  const pathname = usePathname();
  const [stats, setStats] = useState({ overdue: 0, dueSoon: 0, onTrack: 0 });

  async function fetchStats() {
    try {
      const res = await fetch("/api/cards/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }

  useEffect(() => {
    fetchStats();
    // Optional: Poll every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md z-50">

      {/* Left: Logo & Nav */}
      <div className="flex items-center gap-8 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-indigo-400">
            <LayoutDashboard size={20} />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            TaskAI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
          <Link
            href="/board"
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${pathname === "/board"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}
            `}
          >
            <LayoutDashboard size={14} />
            Kanban
          </Link>
          <Link
            href="/calendar"
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${pathname === "/calendar"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}
            `}
          >
            <CalendarIcon size={14} />
            Calendário
          </Link>
        </nav>

        {/* Search Button (Triggers Modal) */}
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="hidden lg:flex items-center gap-2 bg-black/20 hover:bg-black/40 border border-white/10 hover:border-indigo-500/50 rounded-lg px-3 py-1.5 transition-all group"
          >
            <Search size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
            {/* <span className="text-xs text-slate-500 group-hover:text-slate-300">Pesquisar...</span> */}
          </button>
        )}
      </div>

      {/* Center: Stats (Absolute to remain centered) */}
      <div className="hidden xl:flex items-center gap-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">

        {/* Overdue (Atrasadas) -> Fire */}
        <div
          className={`flex items-center gap-2 group ${onStatClick ? 'cursor-pointer' : 'cursor-default'}`}
          title="Atrasadas"
          onClick={() => onStatClick?.('overdue')}
        >
          <div className={`p-1.5 rounded-full ${stats.overdue > 0 ? "bg-red-500/20 text-red-400" : "bg-slate-800/50 text-slate-600"}`}>
            <Flame size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-red-400/80 transition-colors">Atrasadas</span>
            <span className="text-sm font-bold text-white leading-none">{stats.overdue}</span>
          </div>
        </div>

        <div className="w-px h-6 bg-white/5" />

        {/* Today (Hoje) -> Warning */}
        <div
          className={`flex items-center gap-2 group ${onStatClick ? 'cursor-pointer' : 'cursor-default'}`}
          title="Para Hoje"
          onClick={() => onStatClick?.('dueSoon')}
        >
          <div className={`p-1.5 rounded-full ${stats.dueSoon > 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-800/50 text-slate-600"}`}>
            <AlertTriangle size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-yellow-400/80 transition-colors">Hoje</span>
            <span className="text-sm font-bold text-white leading-none">{stats.dueSoon}</span>
          </div>
        </div>

        <div className="w-px h-6 bg-white/5" />

        {/* Future (Futuras) -> Calendar */}
        <div
          className={`flex items-center gap-2 group ${onStatClick ? 'cursor-pointer' : 'cursor-default'}`}
          title="Futuras"
          onClick={() => onStatClick?.('onTrack')}
        >
          <div className={`p-1.5 rounded-full ${stats.onTrack > 0 ? "bg-blue-500/20 text-blue-400" : "bg-slate-800/50 text-slate-600"}`}>
            <CalendarIcon size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-400/80 transition-colors">Futuras</span>
            <span className="text-sm font-bold text-white leading-none">{stats.onTrack}</span>
          </div>
        </div>

      </div>

      {/* Right: User */}
      <div className="flex items-center gap-4 z-10">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-slate-400">Olá,</div>
          <div className="text-sm font-semibold text-white">{userName}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white border border-white/20">
          {userName.charAt(0).toUpperCase()}
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all text-xs font-medium"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
