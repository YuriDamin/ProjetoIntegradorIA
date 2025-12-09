"use client";

import { X } from "lucide-react";
import { Card } from "@/types/kanban";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  dateLabel: string;
  tasks: Card[];
  droppableId: string;
  isDragging?: boolean;
  onTaskClick: (task: Card) => void;
}

export default function CalendarDaySidebar({ open, onClose, dateLabel, tasks, droppableId, isDragging, onTaskClick }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop - Hidden during drag to see calendar */}
          <div
            className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 ${isDragging ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            onClick={onClose}
          />

          <Droppable droppableId={droppableId}>
            {(provided, snapshot) => {
              // Logic:
              // Normal: w-96 (Expanded)
              // Dragging: w-16 (Collapsed) - ALWAYS collapsed to avoid covering days
              const isExpanded = !isDragging;

              return (
                <motion.div
                  ref={provided.innerRef}
                  initial={{ x: "100%" }}
                  animate={{
                    x: 0,
                    width: isExpanded ? 384 : 64, // 384px = w-96, 64px = w-16
                  }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className={`
                    fixed top-0 right-0 h-full bg-[#0f172a] border-l border-white/10 shadow-2xl z-50 flex flex-col 
                    overflow-hidden transition-colors duration-300
                    ${isDragging && !isExpanded ? 'opacity-100' : 'opacity-100'}
                    ${snapshot.isDraggingOver && !isExpanded ? 'bg-indigo-900/50 border-indigo-500' : ''}
                  `}
                  onClick={(e) => e.stopPropagation()}
                  {...provided.droppableProps}
                >
                  {/* Content Wrapper - Fades out when retracted */}
                  <div className={`flex flex-col h-full w-96 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20 shrink-0">
                      <h2 className="text-xl font-bold text-white max-w-[80%] truncate" title={dateLabel}>{dateLabel}</h2>
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 bg-[#0f172a]">
                      <div className="mb-4 text-xs text-slate-400 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2 items-start">
                        <span className="text-lg">💡</span>
                        <span>Arraste para o calendário no fundo. Para cancelar, traga de volta para esta barra.</span>
                      </div>

                      <div className={`space-y-3 min-h-[200px] ${snapshot.isDraggingOver ? "bg-white/5 rounded-xl transition" : ""}`}>
                        {tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => onTaskClick(task)}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                }}
                                className={`
                                  p-4 rounded-xl border transition cursor-grab active:cursor-grabbing group
                                  ${dragSnapshot.isDragging
                                    ? "bg-indigo-600/90 border-indigo-500 shadow-2xl z-50 scale-105"
                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                  }
                                `}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-semibold text-white/90">{task.title}</h3>
                                    {task.description && (
                                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-3">
                                  <span className={`
                                    text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide
                                    ${task.priority === 'urgente' ? 'bg-red-500/20 text-red-400' :
                                      task.priority === 'alta' ? 'bg-orange-500/20 text-orange-400' :
                                        task.priority === 'media' ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-slate-500/20 text-slate-400'}
                                  `}>
                                    {task.priority || 'Normal'}
                                  </span>

                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {task.columnId}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  </div>

                  {/* Vertical Label when retracted */}
                  {!isExpanded && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-white/50 font-bold rotate-90 whitespace-nowrap tracking-widest text-lg">
                        CANCELAR
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            }}
          </Droppable>
        </>
      )}
    </AnimatePresence>
  );
}
