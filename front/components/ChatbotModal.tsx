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
  cardId?: string;
}

export default function ChatbotModal({ open, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const botSound = useRef<HTMLAudioElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // 🔵 Marca global se o chat está aberto
  useEffect(() => {
    window.chatbotOpen = open;
  }, [open]);

  // 📌 Carregar histórico
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

  // 📌 Salvar histórico
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  function clearHistory() {
    localStorage.removeItem("chat_history");
    setMessages([
      { from: "bot", text: "Histórico limpo! Como posso te ajudar agora?" },
    ]);
  }

  // 🔊 Som do bot
  useEffect(() => {
    botSound.current = new Audio(
      "data:audio/mp3;base64,//uQxAAAAAAAAAAAA..."
    );
  }, []);

  // ⬇ Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ❌ Fecha ao clicar fora
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

  // 🌟 Detecta JSON e converte automaticamente
  function formatAiActionsFromRaw(rawText: string) {
    try {
      const json = JSON.parse(rawText);
      const actions = json.actions ?? [];
      let summary = "";

      actions.forEach((action: any) => {
        if (!action.ok) return;

        if (action.type === "create-card") {
          summary += `🟢 <b>Card criado com sucesso!</b><br>`;
          summary += `• Título: <i>${action.title}</i><br>`;
          summary += `• Prioridade: <i>${action.priority}</i><br>`;
          summary += `• Coluna: <i>${action.columnId}</i><br><br>`;
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
      });

      return summary.trim() || null;
    } catch {
      return null;
    }
  }

  // 📝 Formatação segura e com JSON autodetector
  function formatMarkdown(text: any) {
    if (text === null || text === undefined) return "";

    // 🌟 Se for JSON bruto contendo ações → converte
    if (
      typeof text === "string" &&
      text.trim().startsWith("{") &&
      text.includes('"actions"')
    ) {
      const formatted = formatAiActionsFromRaw(text);
      if (formatted) return formatted;
    }

    // 🔒 Proteção: converte qualquer coisa em string
    if (typeof text !== "string") {
      try {
        return JSON.stringify(text, null, 2);
      } catch {
        return String(text);
      }
    }

    // Markdown básico
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

  // ✉️ ENVIAR MENSAGEM
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

      // 🎯 JSON MODE — exibe resumo
      if (isJsonMode) {
        const actions = data.reply?.actions ?? [];
        let summary = "";

        actions.forEach((action: any) => {
          if (!action.ok) return;

          if (action.type === "create-card") {
            summary += `🟢 <b>Card criado com sucesso!</b><br>`;
            summary += `• Título: <i>${action.title}</i><br>`;
            summary += `• Prioridade: <i>${action.priority}</i><br>`;
            summary += `• Coluna: <i>${action.columnId}</i><br><br>`;
            createdCardId = action.id;
          }
        });

        botReply = summary.trim() || "⚠️ Não consegui interpretar a ação.";

      } else {
        // 📌 Modo normal → resposta natural da IA
if (typeof data.reply === "object") {
  const formatted = formatAiActionsFromRaw(JSON.stringify(data.reply));
  botReply = formatted || "⚠️ A IA enviou uma estrutura desconhecida.";
} else {
if (typeof data.reply === "object") {
  const formatted = formatAiActionsFromRaw(JSON.stringify(data.reply));
  botReply = formatted || "⚠️ A IA enviou uma estrutura desconhecida.";
} else {
  botReply = data.reply || "Desculpe, não consegui responder agora.";
}
}
      }

      // Adiciona a resposta
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: botReply, cardId: createdCardId },
      ]);

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

  // ✨ Destacar card no board
  function highlightCard(cardId: string) {
    window.dispatchEvent(new CustomEvent("highlight-card", { detail: cardId }));
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
        {/* HEADER */}
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

                {msg.cardId && (
                  <button
                    onClick={() => highlightCard(msg.cardId!)}
                    className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded"
                  >
                    Ver card →
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
