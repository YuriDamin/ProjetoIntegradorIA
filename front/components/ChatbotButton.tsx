"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import ChatbotModal from "./ChatbotModal";

export default function ChatbotButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("chat_open");
    if (saved === "true") setOpen(true);
  }, []);

  function handleOpen() {
    localStorage.setItem("chat_open", "true");
    setOpen(true);
  }

  function handleClose() {
    localStorage.setItem("chat_open", "false");
    setOpen(false);
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={handleOpen}
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
      <ChatbotModal open={open} onClose={handleClose} />
    </>
  );
}
