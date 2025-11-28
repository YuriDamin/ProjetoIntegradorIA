"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";

interface ChatbotModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  from: "user" | "bot";
  text: string;
  cardId?: string; // ⭐ Adicionado para link do card
}

export default function ChatbotModal({ open, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const botSound = useRef<HTMLAudioElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // =====================================================
  // CARREGAR HISTÓRICO
  // =====================================================
  useEffect(() => {
    const saved = localStorage.getItem("chat_history");

    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([
        {
          from: "bot",
          text: "Olá! Sou seu assistente com IA. Como posso te ajudar hoje?",
        },
      ]);
    }
  }, []);

  // =====================================================
  // SALVAR HISTÓRICO
  // =====================================================
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // =====================================================
  // LIMPAR HISTÓRICO
  // =====================================================
  function clearHistory() {
    localStorage.removeItem("chat_history");
    setMessages([
      {
        from: "bot",
        text: "Histórico limpo! Como posso te ajudar agora?",
      },
    ]);
  }

  // carregar som
  useEffect(() => {
    botSound.current = new Audio(
      "data:audio/mp3;base64,//uQxAAAAAAAAAAAA..."
    );
  }, []);

  // scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Fechar clicando fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  // =====================================================
  // ENVIO PARA IA
  // =====================================================
  const handleSend = async () => {
    if (!input.trim() || typing) return;

    let userText = input.trim();
    const isJsonMode = userText.startsWith("/json");

    if (isJsonMode) {
      userText = userText.replace("/json", "").trim();
    }

    setMessages((prev) => [...prev, { from: "user", text: input }]);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          jsonMode: isJsonMode,
        }),
      });

      const data = await res.json();
      let botReply = "";
      let createdCardId: string | undefined = undefined;

      // =====================================================
      // FORMATAÇÃO DAS AÇÕES
      // =====================================================
      if (isJsonMode) {
        if (data.reply && data.reply.actions) {
          const actions = data.reply.actions;
          let summary = "";

          actions.forEach((action) => {
            if (action.ok) {
              // criação de card
              if (action.type === "create-card") {
                summary += `🟢 <b>Card criado com sucesso!</b><br>`;
                summary += `• Título: <i>${action.title}</i><br>`;
                summary += `• Prioridade: <i>${action.priority}</i><br>`;
                summary += `• Coluna: <i>${action.columnId}</i><br><br>`;

                createdCardId = action.id; // ⭐ pegar ID do card criado
              }

              if (action.type === "move-card") {
                summary += `🔀 <b>Card movido com sucesso!</b><br>`;
                summary += `• Card: <i>${action.cardTitle}</i><br>`;
                summary += `• Nova coluna: <i>${action.toColumn}</i><br><br>`;
              }

              if (action.type === "add-checklist") {
                summary += `📋 <b>Checklist adicionada!</b><br>`;
                summary += `• Card: <i>${action.cardTitle}</i><br>`;
                summary += `• Itens: <i>${action.itemsCount}</i><br><br>`;
              }
            } else {
              summary += `⚠️ <b>Ação falhou:</b> ${action.error}<br><br>`;
            }
          });

          botReply = summary.trim() || "Ação executada.";
        } else {
          botReply =
            "⚠️ A IA retornou um JSON inválido.<br><br><pre>" +
            (data.raw || "") +
            "</pre>";
        }
      } else {
        botReply = data.reply || "Desculpe, não consegui responder agora.";
      }

      // adiciona resposta
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: botReply, cardId: createdCardId },
      ]);

      // tocar som
      if (botSound.current) {
        botSound.current.currentTime = 0;
        botSound.current.play().catch(() => {});
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "❌ Erro ao se comunicar com a IA." },
      ]);
    }

    setTyping(false);
  };

  // =====================================================
  // Função para enviar evento highlight
  // =====================================================
  function highlightCard(cardId: string) {
    window.dispatchEvent(
      new CustomEvent("highlight-card", { detail: cardId })
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        ref={modalRef}
        className="
          bg-[#0d1117]
          border border-gray-800
          rounded-xl shadow-2xl
          w-[380px]
          h-[520px]
          flex flex-col
          overflow-hidden
        "
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-gray-700">
          <span className="text-white font-medium">Assistente IA</span>

          <div className="flex gap-4">
            <Trash2
              className="text-gray-400 cursor-pointer hover:text-white"
              size={18}
              onClick={clearHistory}
            />
            <X
              className="text-gray-300 cursor-pointer hover:text-red-500"
              size={20}
              onClick={onClose}
            />
          </div>
        </div>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.from === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`
                  px-4 py-2 rounded-lg max-w-[80%] text-sm whitespace-pre-wrap
                  ${
                    msg.from === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-100 border border-gray-700"
                  }
                `}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(msg.text),
                  }}
                />

                {/* BOTÃO “VER CARD” */}
                {msg.cardId && (
                  <button
                    onClick={() => highlightCard(msg.cardId!)}
                    className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded"
                  >
                    Ver card no board →
                  </button>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="text-gray-400 text-xs animate-pulse">
              IA está digitando...
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-gray-700 flex gap-2 bg-[#0d1117]">
          <input
            type="text"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
            placeholder="Digite algo... (use /json para JSON Mode)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
            disabled={typing}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMarkdown(text: string) {
  return text
    .replace(
      /```json([\s\S]*?)```/g,
      "<pre class='bg-black/40 p-3 rounded border border-gray-700 text-[11px]'>$1</pre>"
    )
    .replace(
      /```([\s\S]*?)```/g,
      "<pre class='bg-black/40 p-3 rounded border border-gray-700 text-[11px]'>$1</pre>"
    )
    .replace(/\n/g, "<br>");
}
