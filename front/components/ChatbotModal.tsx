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
  actions?: any[];
}

interface ActionResult {
  ok: boolean;
  type: string;
  title?: string;
  priority?: string;
  columnId?: string;
  id?: string;
  cardTitle?: string;
  toColumn?: string;
  itemsCount?: number;
  error?: string;
  proposedAction?: string;
  question?: string;
}

export default function ChatbotModal({ open, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const botSound = useRef<HTMLAudioElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("chat_history");
    const savedHistory = localStorage.getItem("ai_conversation_history");

    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([
        {
          from: "bot",
          text: "Olá! Sou seu assistente com IA. Posso ajudar você a criar tarefas no seu quadro Kanban. Por exemplo: 'Preciso comprar pão' ou 'Vou alugar um filme'.",
        },
      ]);
    }

    if (savedHistory) {
      setConversationHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (conversationHistory.length > 0) {
      localStorage.setItem("ai_conversation_history", JSON.stringify(conversationHistory));
    }
  }, [conversationHistory]);

  function clearHistory() {
    localStorage.removeItem("chat_history");
    localStorage.removeItem("ai_conversation_history");
    setMessages([
      {
        from: "bot",
        text: "Histórico limpo! Como posso te ajudar agora? Diga algo como 'preciso comprar pão' ou 'vou viajar amanhã'.",
      },
    ]);
    setConversationHistory([]);
  }

  useEffect(() => {
    botSound.current = new Audio(
      "data:audio/mp3;base64,//uQxAAAAAAAAAAAA..."
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

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

  function extractTaskTitleFromMessage(message: string): string {
    const lowerMsg = message.toLowerCase();
    
    // Tenta encontrar o padrão "comprar [algo]"
    const buyMatch = lowerMsg.match(/(?:preciso|tenho que|vou)\s+(?:comprar\s+)?([^,.!?]+)/);
    if (buyMatch && buyMatch[1]) {
      const item = buyMatch[1].trim();
      return `Comprar ${item.charAt(0).toUpperCase() + item.slice(1)}`;
    }
    
    // Tenta encontrar o padrão "fazer [algo]"
    const doMatch = lowerMsg.match(/(?:preciso|tenho que|vou)\s+(?:fazer\s+)?([^,.!?]+)/);
    if (doMatch && doMatch[1]) {
      const item = doMatch[1].trim();
      return `Fazer ${item.charAt(0).toUpperCase() + item.slice(1)}`;
    }
    
    // Padrão genérico
    const genericMatch = lowerMsg.match(/(?:preciso|tenho que|vou)\s+([^,.!?]+)/);
    if (genericMatch && genericMatch[1]) {
      const item = genericMatch[1].trim();
      return item.charAt(0).toUpperCase() + item.slice(1);
    }
    
    return message.substring(0, 50);
  }

  function formatActionResponse(actions: ActionResult[]): string {
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return "❌ <b>Resposta inválida da IA.</b>";
    }
    
    const action = actions[0];
    let response = "";
    
    if (action.ok) {
      switch (action.type) {
        case "confirm-scope":
          if (action.proposedAction === "greeting") {
            response += `👋 <b>Olá!</b><br>`;
          } else if (action.proposedAction === "help") {
            response += `🤔 <b>Ajuda</b><br>`;
          } else if (action.proposedAction?.startsWith("Criar tarefa:")) {
            response += `🤔 <b>Confirmação necessária</b><br>`;
          } else {
            response += `🤔 <b>Confirmação</b><br>`;
          }
          
          response += `• ${action.question || "Como posso ajudar?"}<br>`;
          
          // SÓ mostra instrução se for confirmação de tarefa
          if (action.proposedAction?.startsWith("Criar tarefa:")) {
            response += `<br><small><i>Responda "sim" para confirmar ou "não" para corrigir</i></small>`;
          }
          break;
          
        case "create-card":
          response += `✅ <b>Tarefa criada com sucesso!</b><br>`;
          response += `• <i>${action.title || "Sem título"}</i><br>`;
          response += `• Prioridade: ${action.priority || "média"}<br>`;
          response += `• Coluna: ${action.columnId || "backlog"}<br>`;
          break;
          
        default:
          response += `⚡ ${action.type}<br>`;
      }
    } else {
      response += `❌ <b>Erro</b><br>`;
      response += `• ${action.error || "Erro desconhecido"}<br>`;
    }
    
    return response.trim();
  }
  

  // No seu ChatbotModal.tsx, atualize o handleSend:

const handleSend = async () => {
  if (!input.trim() || typing) return;

  const userText = input.trim();
  
  // Adiciona mensagem do usuário
  const userMessage: ChatMessage = { from: "user", text: userText };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setTyping(true);

  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        history: conversationHistory,
      }),
    });

    // Verifica se a resposta é OK
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Verifica se a resposta tem estrutura esperada
    if (!data || typeof data !== 'object') {
      throw new Error("Resposta inválida do servidor");
    }
    
    let botReply = "";
    let createdCardId: string | undefined = undefined;
    let botActions: ActionResult[] = [];

    // Atualiza o histórico
    if (data.history) {
      setConversationHistory(data.history);
    }

    if (data.reply?.actions) {
      botActions = data.reply.actions;
      botReply = formatActionResponse(botActions);
      
      // Extrai ID do card criado
      const createdCard = botActions.find(
        (action: ActionResult) => action.ok && action.type === "create-card" && action.id
      );
      if (createdCard) {
        createdCardId = createdCard.id;
      }
    } else if (data.error) {
      botReply = `❌ <b>Erro:</b> ${data.error}`;
    } else {
      botReply = "❌ <b>Resposta inválida</b>";
    }

    // Adiciona resposta do bot
    const botMessage: ChatMessage = {
      from: "bot",
      text: botReply,
      cardId: createdCardId,
      actions: botActions,
    };
    
    setMessages((prev) => [...prev, botMessage]);

  } catch (error) {
    console.error("Erro completo:", error);
    setMessages((prev) => [
      ...prev,
      { 
        from: "bot", 
        text: "❌ <b>Erro de conexão</b><br>Não foi possível processar sua mensagem. Tente novamente." 
      },
    ]);
  } finally {
    setTyping(false);
  }
};

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
          <span className="text-white font-medium">Assistente IA - Kanban</span>

          <div className="flex gap-4">
            <button
              onClick={clearHistory}
              className="text-gray-400 hover:text-white transition-colors"
              title="Limpar histórico"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-red-500 transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
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

                {/* BOTÃO "VER CARD" - só mostra se houver cardId */}
                {msg.cardId && (
                  <button
                    onClick={() => highlightCard(msg.cardId!)}
                    className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition-colors"
                  >
                    👁️ Ver card no board
                  </button>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-gray-700 flex gap-2 bg-[#0d1117]">
          <input
            type="text"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors"
            placeholder="Ex: Preciso comprar pão..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={typing || !input.trim()}
          >
            {typing ? "..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  if (!text) return "";
  
  // Converte string para garantir que seja tratada como texto
  const textStr = String(text);
  
  return textStr
    .replace(/<br>/g, '\n')
    .replace(/\n/g, '<br>')
    .replace(
      /```json([\s\S]*?)```/g,
      "<pre class='bg-black/40 p-3 rounded border border-gray-700 text-[11px] overflow-x-auto'>$1</pre>"
    )
    .replace(
      /```([\s\S]*?)```/g,
      "<pre class='bg-black/40 p-3 rounded border border-gray-700 text-[11px] overflow-x-auto'>$1</pre>"
    )
    .replace(
      /<pre[^>]*>([\s\S]*?)<\/pre>/g,
      (match, content) => match
    )
    .replace(
      /`([^`]+)`/g,
      "<code class='bg-gray-900 px-1 py-0.5 rounded text-xs'>$1</code>"
    )
    .replace(
      /\*\*(.*?)\*\*/g,
      "<b>$1</b>"
    )
    .replace(
      /\*(.*?)\*/g,
      "<i>$1</i>"
    );
}