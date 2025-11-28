"use client";

import { useEffect, useRef, useState } from "react";
import { X, Minus } from "lucide-react";

interface ChatbotModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  from: "user" | "bot";
  text: string;
}

export default function ChatbotModal({ open, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      text: "Olá! Sou seu assistente com IA. Como posso te ajudar hoje?"
    },
  ]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const botSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    botSound.current = new Audio(
      "data:audio/mp3;base64,//uQxAAAAAAAAAAAA..."
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const modalRef = useRef<HTMLDivElement | null>(null);

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
      const res = await fetch("http://localhost:3001/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          jsonMode: isJsonMode,
        }),
      });

      const data = await res.json();
      let botReply = "";

      if (isJsonMode) {
        if (data.reply) {
          botReply =
            "```json\n" + JSON.stringify(data.reply, null, 2) + "\n```";
        } else {
          botReply =
            "⚠️ A IA retornou um JSON inválido.\n\nRAW:\n```\n" +
            data.raw +
            "\n```";
        }
      } else {
        botReply = data.reply || "Desculpe, não consegui responder agora.";
      }

      setMessages((prev) => [...prev, { from: "bot", text: botReply }]);

      if (botSound.current) {
        botSound.current.currentTime = 0;
        botSound.current.play().catch(() => {});
      }

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "❌ Erro ao se comunicar com a IA." },
      ]);
    }

    setTyping(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* POP-UP */}
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
          backdrop-blur-md
          animate-fade-in animate-scale-in
        "
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-gray-700 rounded-t-xl">
          <span className="text-white font-medium">Assistente IA</span>

          <div className="flex gap-3">
            <Minus
              className="text-gray-300 cursor-pointer hover:text-white transition"
              onClick={() => setMinimized(!minimized)}
            />
            <X
              className="text-gray-300 cursor-pointer hover:text-red-500 transition"
              onClick={onClose}
            />
          </div>
        </div>

        {/* CHAT */}
        {!minimized && (
          <>
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
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }}
                  ></div>
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
                className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none"
                placeholder="Digite algo... (use /json para JSON Mode)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                disabled={typing}
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatMarkdown(text: string) {
  return text
    .replace(/```json([\s\S]*?)```/g, "<pre class='text-left bg-black/40 p-3 rounded-md border border-gray-700 overflow-auto text-[11px]'>$1</pre>")
    .replace(/```([\s\S]*?)```/g, "<pre class='text-left bg-black/40 p-3 rounded-md border border-gray-700 overflow-auto text-[11px]'>$1</pre>");
}
