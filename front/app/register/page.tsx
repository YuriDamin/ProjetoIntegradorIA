"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successModal, setSuccessModal] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (pass !== confirmPass) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: pass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao registrar usuário");
        setLoading(false);
        return;
      }

      setSuccessModal(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);

    } catch (err) {
      console.error(err);
      setError("Erro ao conectar ao servidor");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#050f25] to-[#071a33] p-4">
      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#0F1A2F] border border-emerald-500/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-300">
            <div className="size-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="text-emerald-400 size-8 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Conta criada com sucesso!
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Você será redirecionado para o login em instantes...
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              Ir para Login agora
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0F1A2F]/90 border border-white/10 rounded-2xl shadow-2xl p-10 w-full max-w-md">

        <h1 className="text-white text-2xl font-semibold text-center mb-2">
          Criar conta
        </h1>
        <p className="text-slate-400 text-sm text-center mb-6">
          Preencha os campos abaixo para se registrar
        </p>

        <form onSubmit={handleRegister} className="space-y-5">

          <div>
            <label className="text-slate-300 text-sm">Nome</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg mt-1 bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg mt-1 bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">Senha</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-lg mt-1 bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">Confirmar senha</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-lg mt-1 bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            Criar conta
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-4">
          Já possui conta?
          <Link href="/login" className="text-emerald-400 ml-1 hover:underline">
            Fazer login
          </Link>
        </p>

      </div>
    </div>
  );
}
