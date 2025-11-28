"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#050f25] to-[#071a33] p-4">
      <div className="bg-[#0F1A2F]/90 border border-white/10 rounded-2xl shadow-2xl p-10 w-full max-w-md">

        <h1 className="text-white text-2xl font-semibold text-center mb-2">
          Recuperar senha
        </h1>

        {!sent ? (
          <>
          <p className="text-slate-400 text-sm text-center mb-6">
            Digite o seu email e enviaremos um link de recuperação
          </p>

          <form onSubmit={handleRecover} className="space-y-5">

            <div>
              <label className="text-slate-300 text-sm">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 rounded-lg mt-1 bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Enviar email de recuperação
            </button>
          </form>
          </>
        ) : (
          <div className="text-center text-slate-300 text-sm">
            ✔ Email enviado com sucesso!  
            <br /><br />
            Verifique sua caixa de entrada e siga as instruções.
          </div>
        )}

        <p className="text-center text-slate-400 text-sm mt-6">
          <Link href="/login" className="text-emerald-400 hover:underline">
            Voltar ao login
          </Link>
        </p>

      </div>
    </div>
  );
}
