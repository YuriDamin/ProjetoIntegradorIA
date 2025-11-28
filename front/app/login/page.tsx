"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Usuário ou senha incorretos");
        setLoading(false);
        return;
      }

      document.cookie = `token=${data.token}; path=/; max-age=604800`; // 7 dias

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      router.push("/board");

    } catch (err) {
      console.error(err);
      setError("Erro ao conectar ao servidor");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#050f25] to-[#071a33] p-4">
      <div className="bg-[#0F1A2F]/90 border border-white/10 rounded-2xl shadow-2xl p-10 w-full max-w-md">

        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className="size-16 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow">
            A
          </div>

          <h1 className="text-white text-2xl font-semibold mt-4">
            Bem-vindo
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label className="text-slate-300 text-sm">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg mt-1 bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">Senha</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-lg mt-1 bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
              placeholder="•••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* ERRO */}
          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* BOTÃO */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            Entrar
          </button>
        </form>

        {/* LINKS */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Não tem conta?
          <Link href="/register" className="text-emerald-400 ml-1 hover:underline">
            Criar conta
          </Link>
        </p>

        <p className="text-center text-slate-400 text-sm mt-2">
          <Link href="/forgot-password" className="text-emerald-400 hover:underline">
            Esqueci minha senha
          </Link>
        </p>
      </div>
    </div>
  );
}
