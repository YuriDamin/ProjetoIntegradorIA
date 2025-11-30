"use client"

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import moment from 'moment'
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

import 'react-big-calendar/lib/css/react-big-calendar.css'

interface CalendarEvent {
    id: string
    title: string
    description: string
    status: string
    priority: string
    dueDate: string
    allDay: boolean
    start: Date
    end: Date
    color?: string
}

interface CalendarModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectTask: (task: CalendarEvent) => void
    onCreateTask: (date: string) => void
}

interface ColumnData {
    cards: Array<{
        id: string
        title: string
        description?: string
        status?: string
        priority?: string
        dueDate?: string
    }>
}

interface BoardData {
    columns: Record<string, ColumnData>
}

// Custom Toolbar Component
const CustomToolbar = ({ 
    date, 
    view, 
    views, 
    onView, 
    onNavigate 
}: {
    date: Date
    view: View
    views: View[]
    onView: (view: View) => void
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
}) => {
    const formattedDate = useMemo(() => {
        switch (view) {
            case 'month':
                return moment(date).format('MMMM YYYY')
            case 'week':
                const start = moment(date).startOf('week')
                const end = moment(date).endOf('week')
                return `${start.format('D MMM')} - ${end.format('D MMM YYYY')}`
            case 'day':
                return moment(date).format('DD MMMM YYYY')
            default:
                return moment(date).format('MMMM YYYY')
        }
    }, [date, view])

    return (
        <div className="custom-toolbar">
            <div className="toolbar-section left-section">
                <button 
                    className="nav-btn prev-btn"
                    onClick={() => onNavigate('PREV')}
                >
                    <ChevronLeft size={18} />
                    <span>Anterior</span>
                </button>
                
                <button 
                    className="nav-btn today-btn"
                    onClick={() => onNavigate('TODAY')}
                >
                    Hoje
                </button>
                
                <button 
                    className="nav-btn next-btn"
                    onClick={() => onNavigate('NEXT')}
                >
                    <span>Próximo</span>
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="toolbar-section center-section">
                <h2 className="current-date">{formattedDate}</h2>
            </div>

            <div className="toolbar-section right-section">
                {views.map((v) => (
                    <button
                        key={v}
                        className={`view-btn ${view === v ? 'active' : ''}`}
                        onClick={() => onView(v)}
                    >
                        {v === 'month' && 'Mês'}
                        {v === 'week' && 'Semana'}
                        {v === 'day' && 'Dia'}
                        {v === 'agenda' && 'Agenda'}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function CalendarModal({ isOpen, onClose, onSelectTask, onCreateTask }: CalendarModalProps) {
    const [currentView, setCurrentView] = useState<View>('month')
    const [currentDate, setCurrentDate] = useState<Date>(new Date())
    const [tasks, setTasks] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    
    const localizer = useMemo(
        () =>
            dateFnsLocalizer({
                format,
                parse,
                startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
                getDay,
                locales: { 'pt-BR': ptBR },
            }),
        []
    )

    // Buscar todas as tarefas quando abrir
    const loadTasks = useCallback(async () => {
        try {
            setLoading(true)
            
            const res = await fetch('/api/columns', {
                credentials: 'include',
            })

            if (!res.ok) throw new Error('Erro ao buscar tarefas')

            const boardData = await res.json() as BoardData
            
            const allTasks: CalendarEvent[] = []
            
            Object.values(boardData.columns).forEach((column: ColumnData) => {
                column.cards.forEach((card) => {
                    const eventDate = card.dueDate ? new Date(card.dueDate) : new Date()
                    
                    allTasks.push({
                        id: card.id,
                        title: card.title,
                        description: card.description || '',
                        status: card.status || 'backlog',
                        priority: card.priority || 'medium',
                        dueDate: moment(eventDate).format("YYYY-MM-DD"),
                        allDay: true,
                        start: moment(eventDate).startOf('day').toDate(),
                        end: moment(eventDate).endOf('day').toDate(),
                        color: getColorByPriority(card.priority || 'medium')
                    })
                })
            })
            
            setTasks(allTasks)
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isOpen) {
            loadTasks()
        }
    }, [isOpen, loadTasks])

    // Definir cor baseada na prioridade
    function getColorByPriority(priority: string) {
        const colors: Record<string, string> = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981',
        }
        return colors[priority] || '#155dfc'
    }

    // Selecionar dia vazio para criar nova tarefa
    const handleSelectSlot = useCallback(({ start }: { start: Date; end: Date }) => {
        const dateStr = moment(start).format("YYYY-MM-DD")
        onCreateTask(dateStr)
        onClose()
    }, [onCreateTask, onClose])

    // Selecionar tarefa existente
    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        onSelectTask(event)
        onClose()
    }, [onSelectTask, onClose])

    // Mudar visualização
    const handleViewChange = useCallback((view: View) => {
        setCurrentView(view)
    }, [])

    // Navegação
    const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
        console.log('Navegação:', action)
        const newDate = new Date(currentDate)
        
        switch (action) {
            case 'PREV':
                if (currentView === 'month') {
                    newDate.setMonth(newDate.getMonth() - 1)
                } else if (currentView === 'week') {
                    newDate.setDate(newDate.getDate() - 7)
                } else {
                    newDate.setDate(newDate.getDate() - 1)
                }
                break
            case 'NEXT':
                if (currentView === 'month') {
                    newDate.setMonth(newDate.getMonth() + 1)
                } else if (currentView === 'week') {
                    newDate.setDate(newDate.getDate() + 7)
                } else {
                    newDate.setDate(newDate.getDate() + 1)
                }
                break
            case 'TODAY':
                setCurrentDate(new Date())
                return
        }
        
        setCurrentDate(newDate)
    }, [currentDate, currentView])

    // Fechar ao pressionar ESC
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    // Fechar ao clicar no backdrop
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
        >
            <div className="relative w-[98vw] h-[96vh] bg-linear-to-br from-[#050816]/95 via-[#0A1224]/95 to-[#020617]/95 rounded-3xl border border-white/20 shadow-2xl overflow-hidden backdrop-blur-xl">
                
                {/* Header do Modal */}
                <div className="flex items-center justify-between px-8 py-6 bg-white/5 backdrop-blur-xl border-b border-white/10">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">Calendário de Tarefas</h2>
                        <p className="text-white/60 text-sm">Visualize e organize suas tarefas por data</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                onCreateTask(moment().format("YYYY-MM-DD"))
                                onClose()
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white bg-white/5 hover:bg-white/10 border border-white/10 transition font-medium"
                        >
                            <Plus size={18} />
                            Nova Tarefa
                        </button>
                        
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-10 h-10 rounded-xl text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Corpo do Calendário */}
                <div className="h-[calc(96vh-120px)] overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-white text-lg">Carregando calendário...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-6 shadow-2xl" style={{ height: 'calc(100% - 20px)' }}>
                            {/* Custom Toolbar */}
                            <CustomToolbar
                                date={currentDate}
                                view={currentView}
                                views={['month', 'week', 'day', 'agenda']}
                                onView={handleViewChange}
                                onNavigate={handleNavigate}
                            />

                            <Calendar
                                localizer={localizer}
                                events={tasks}
                                startAccessor="start"
                                endAccessor="end"
                                view={currentView}
                                date={currentDate}
                                onView={handleViewChange}
                                onNavigate={setCurrentDate}
                                onSelectEvent={handleSelectEvent}
                                onSelectSlot={handleSelectSlot}
                                selectable
                                defaultView="month"
                                views={['month', 'week', 'day', 'agenda']}
                                eventPropGetter={(event: CalendarEvent) => ({
                                    style: {
                                        backgroundColor: event.color || '#155dfc',
                                        color: 'white',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }
                                })}
                                style={{ 
                                    height: 'calc(100% - 80px)',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                }}
                                messages={{
                                    today: 'Hoje',
                                    previous: 'Anterior',
                                    next: 'Próximo',
                                    month: 'Mês',
                                    week: 'Semana',
                                    day: 'Dia',
                                    agenda: 'Agenda',
                                    noEventsInRange: 'Nenhuma tarefa neste período.',
                                    showMore: (total) => `+${total} mais`,
                                    allDay: 'Dia inteiro'
                                }}
                            />

                            {/* CSS para a toolbar customizada */}
                            <style jsx global>{`
                                /* Esconde a toolbar padrão */
                                .rbc-toolbar {
                                    display: none !important;
                                }

                                /* Toolbar Customizada */
                                .custom-toolbar {
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    background: #ffffff;
                                    padding: 20px;
                                    border-radius: 12px;
                                    margin-bottom: 20px;
                                    border: 1px solid #e5e7eb;
                                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                                    gap: 15px;
                                    flex-wrap: wrap;
                                }

                                .toolbar-section {
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                }

                                .left-section {
                                    justify-content: flex-start;
                                }

                                .center-section {
                                    justify-content: center;
                                    flex: 1;
                                }

                                .right-section {
                                    justify-content: flex-end;
                                }

                                /* Botões de navegação */
                                .nav-btn {
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                    padding: 10px 16px;
                                    background: white;
                                    border: 2px solid #155dfc;
                                    color: #155dfc;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    font-size: 14px;
                                    min-width: auto;
                                }

                                .nav-btn:hover {
                                    background: #155dfc;
                                    color: white;
                                    transform: translateY(-1px);
                                    box-shadow: 0 4px 8px rgba(21, 93, 252, 0.3);
                                }

                                .today-btn {
                                    background: #155dfc;
                                    color: white;
                                    border-color: #155dfc;
                                }

                                .today-btn:hover {
                                    background: #0d4bd1;
                                    border-color: #0d4bd1;
                                    transform: translateY(-1px);
                                }

                                /* Data atual */
                                .current-date {
                                    font-size: 24px;
                                    font-weight: bold;
                                    color: #155dfc;
                                    margin: 0;
                                    text-align: center;
                                }

                                /* Botões de visualização */
                                .view-btn {
                                    padding: 10px 16px;
                                    background: white;
                                    border: 2px solid #e5e7eb;
                                    color: #6b7280;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    font-size: 14px;
                                    min-width: 70px;
                                }

                                .view-btn:hover {
                                    border-color: #155dfc;
                                    color: #155dfc;
                                    transform: translateY(-1px);
                                }

                                .view-btn.active {
                                    background: #155dfc;
                                    border-color: #155dfc;
                                    color: white;
                                }

                                /* Responsivo */
                                @media (max-width: 1024px) {
                                    .custom-toolbar {
                                        flex-direction: column;
                                        gap: 15px;
                                        text-align: center;
                                    }

                                    .toolbar-section {
                                        justify-content: center;
                                        width: 100%;
                                    }

                                    .center-section {
                                        order: -1;
                                    }

                                    .current-date {
                                        font-size: 20px;
                                    }
                                }

                                @media (max-width: 640px) {
                                    .left-section, .right-section {
                                        flex-wrap: wrap;
                                        justify-content: center;
                                    }

                                    .nav-btn, .view-btn {
                                        padding: 8px 12px;
                                        font-size: 12px;
                                    }

                                    .current-date {
                                        font-size: 18px;
                                    }
                                }

                                /* Seu CSS personalizado existente */
                                .rbc-header {
                                    color: #ffffff;
                                    font-size: 16px;
                                    background: linear-gradient(135deg, #155dfc 0%, #0d4bd1 100%);
                                    border: none !important;
                                    padding: 12px 8px;
                                    border-radius: 12px;
                                    margin: 2px;
                                    font-weight: 600;
                                    text-align: center;
                                }

                                .rbc-button-link {
                                    font-size: 14px;
                                    font-weight: 600;
                                    color: #155dfc;
                                    background: rgba(21, 93, 252, 0.1);
                                    border-radius: 8px;
                                    padding: 6px;
                                    margin: 4px;
                                    display: inline-block;
                                    min-width: 30px;
                                    transition: all 0.2s ease;
                                }

                                .rbc-button-link:hover {
                                    background: rgba(21, 93, 252, 0.2);
                                    transform: scale(1.05);
                                }

                                .rbc-month-view {
                                    border: none;
                                    background: transparent;
                                }

                                .rbc-day-bg {
                                    border-radius: 12px;
                                    border: 1px solid #e5e7eb;
                                    margin: 3px;
                                    background: #ffffff;
                                    transition: all 0.2s ease;
                                }

                                .rbc-day-bg:hover {
                                    background: #f8fafc;
                                    border-color: #155dfc;
                                }

                                .rbc-today {
                                    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
                                    border: 2px solid #155dfc !important;
                                }

                                .rbc-event {
                                    border-radius: 8px;
                                    padding: 4px 8px;
                                    font-weight: 600;
                                    font-size: 12px;
                                    border: none;
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                    margin: 1px 0;
                                }

                                .rbc-event:hover {
                                    transform: translateY(-2px);
                                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                                }
                            `}</style>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}