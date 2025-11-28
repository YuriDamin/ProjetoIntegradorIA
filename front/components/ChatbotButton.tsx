"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ChatbotModal from "./ChatbotModal";

export default function ChatbotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className="
          fixed 
          bottom-6 
          right-6
          bg-gradient-to-br from-emerald-500 to-emerald-600
          hover:from-emerald-400 hover:to-emerald-500 
          text-white
          shadow-xl shadow-emerald-600/30
          rounded-full 
          p-4
          transition 
          ease-out 
          hover:scale-110
        "
      >
        <MessageSquare size={24} />
      </button>

      {/* Modal do Chatbot */}
      <ChatbotModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
