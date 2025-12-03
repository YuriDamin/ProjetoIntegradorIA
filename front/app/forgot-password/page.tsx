"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ChangePasswordPage() {
  // Estados para os campos
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estados de controle de interface
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validações básicas locais
    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("A nova senha não pode ser igual à atual.");
      return;
    }

    setLoading(true);

    // Simulação de chamada ao Backend/Banco de Dados Local
    setTimeout(() => {
      // Aqui entraria sua lógica real de atualização no banco
      // ex: await updatePassword(userId, currentPassword, newPassword)
      
      setLoading(false);
      setSuccess(true);
      
      // Limpar campos
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#050f25] to-[#071a33] p-4">
      <div className="bg-[#0F1A2F]/90 border border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden">
        
        {/* Efeito de brilho no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-emerald-500/50 blur-md rounded-full"></div>

        <h1 className="text-white text-2xl font-semibold text-center mb-2">
          Alterar Senha
        </h1>
        <p className="text-slate-400 text-sm text-center mb-8">
          Atualize sua credencial de acesso
        </p>

        {!success ? (
          <form onSubmit={handleChangePassword} className="space-y-4">
            
            {/* Campo: Senha Atual */}
            <div>
              <label className="text-slate-300 text-sm mb-1 block">Senha Atual</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-2 rounded-lg bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
                  placeholder="••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-800 my-2"></div>

            {/* Campo: Nova Senha */}
            <div>
              <label className="text-slate-300 text-sm mb-1 block">Nova Senha</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-2 rounded-lg bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo: Confirmar Nova Senha */}
            <div>
              <label className="text-slate-300 text-sm mb-1 block">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  className="w-full pl-10 py-2 rounded-lg bg-slate-900/70 border border-slate-700 text-white outline-none focus:border-emerald-500 transition"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-500/10 text-red-400 text-xs px-3 py-2 rounded border border-red-500/20 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Atualizando...
                </>
              ) : (
                "Confirmar Alteração"
              )}
            </button>
          </form>
        ) : (
          /* TELA DE SUCESSO */
          <div className="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <h2 className="text-white text-lg font-medium mb-2">Senha Alterada!</h2>
            <p className="text-slate-400 text-sm text-center max-w-[200px] mb-6">
              Sua senha foi atualizada com sucesso no sistema.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="text-emerald-400 hover:text-emerald-300 text-sm underline"
            >
              Alterar novamente
            </button>
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/login" className="text-slate-500 hover:text-white text-sm transition flex items-center justify-center gap-1">
            ← Voltar para o início
          </Link>
        </div>

      </div>
    </div>
  );
}