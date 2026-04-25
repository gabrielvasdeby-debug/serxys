'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Calendar, User, Clock, CheckCircle2, 
  Filter, Search, X, Activity,
  ClipboardList, Wrench, 
  Check, Play, Pause
} from 'lucide-react';
import { supabase } from '../supabase';
import { Order, Profile } from '../types';
import { Customer } from './ClientesModule';
import { capFirst } from '../utils/capFirst';

interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;
  technicianId: string;
  technicianName: string;
  priority: 'Baixa' | 'Média' | 'Alta';
  status: 'Pendente' | 'Em andamento' | 'Concluída';
  type: 'manual' | 'os';
  osId?: string;
  osNumber?: number;
  createdAt: string;
  createdBy: string;
}

interface AgendaModuleProps {
  profile: Profile;
  profiles: Profile[];
  orders: Order[];
  customers: Customer[];
  onBack: () => void;
  onShowToast: (message: string) => void;
  onOpenOsStatus: (order: Order) => void;
}

const PRIORITY_CONFIG = {
  'Baixa': { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', dot: 'bg-blue-400' },
  'Média': { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', dot: 'bg-yellow-400' },
  'Alta': { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400' }
};

const STATUS_CONFIG = {
  'Pendente': { color: 'text-red-400', bg: 'bg-red-400/10', icon: Clock, border: 'border-red-400/20' },
  'Em andamento': { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Play, border: 'border-yellow-400/20' },
  'Concluída': { color: 'text-[#00E676]', bg: 'bg-[#00E676]/10', icon: CheckCircle2, border: 'border-[#00E676]/20' }
};

export default function AgendaModule({
  profile,
  profiles,
  orders,
  customers,
  onBack,
  onShowToast,
  onOpenOsStatus
}: AgendaModuleProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Filters
  const [filterTechnician, setFilterTechnician] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default para hoje
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // New Task Form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    technicianId: '',
    priority: 'Média' as 'Baixa' | 'Média' | 'Alta',
    type: 'manual' as 'manual' | 'os',
    osId: ''
  });

  const technicians = useMemo(() => profiles.filter(p => p.type === 'Técnico' || p.type === 'ADM'), [profiles]);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('agenda')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('date', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (data) {
        setTasks(data.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          date: t.date,
          technicianId: t.technician_id,
          technicianName: t.technician_name,
          priority: t.priority,
          status: t.status,
          type: t.type,
          osId: t.os_id,
          osNumber: t.os_number,
          createdAt: t.created_at,
          createdBy: t.user_id
        })) as Task[]);
      }
      setIsLoading(false);
    };

    fetchTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Se for técnico, só vê as próprias tarefas
      if (profile.type === 'Técnico' && t.technicianId !== profile.id) return false;

      const matchesTechnician = filterTechnician === 'ALL' || t.technicianId === filterTechnician;
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const matchesDate = !filterDate || t.date === filterDate;
      const matchesSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.osNumber?.toString().includes(searchQuery);
      
      return matchesTechnician && matchesStatus && matchesDate && matchesSearch;
    });
  }, [tasks, filterTechnician, filterStatus, filterDate, searchQuery, profile.id, profile.type]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      if (!groups[task.technicianId]) groups[task.technicianId] = [];
      groups[task.technicianId].push(task);
    });
    return groups;
  }, [filteredTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.technicianId || !newTask.date) {
      onShowToast('Preencha todos os campos obrigatórios');
      return;
    }

    const technician = profiles.find(p => p.id === newTask.technicianId);
    const linkedOs = newTask.type === 'os' ? orders.find(o => o.id === newTask.osId) : null;

    // Validação de Segurança
    if (!profile?.company_id || !profile?.id) {
      const msg = `Perfil incompleto: company_id=${profile?.company_id}, user_id=${profile?.id}`;
      console.error(msg);
      onShowToast('Erro: Seu perfil não carregou corretamente. Recarregue a página.');
      return;
    }

    const taskData: any = {
      title: newTask.title,
      description: newTask.description || '',
      date: newTask.date,
      technician_id: newTask.technicianId,
      technician_name: technician?.name || 'Técnico',
      priority: newTask.priority,
      status: 'Pendente',
      type: newTask.type,
      user_id: profile.id,
      company_id: profile.company_id
    };

    if (newTask.type === 'os') {
      if (newTask.osId) {
        taskData.os_id = newTask.osId;
      }
      if (linkedOs?.osNumber) taskData.os_number = linkedOs.osNumber;
    }

    try {
      // LOG DIAGNÓSTICO: veja no console o que está sendo enviado


      const { error, status, statusText } = await supabase
        .from('agenda')
        .insert(taskData);



      if (error) {
        console.error('ERROR TYPE:', typeof error);
        console.error('ERROR INSTANCEOF Error:', error instanceof Error);
        console.error('ERROR KEYS:', Object.keys(error));
        console.error('ERROR for..in:');
        for (const k in error) console.error(' -', k, ':', (error as any)[k]);
        console.error('ERROR direct props:', error.message, error.code, error.details, error.hint);
        console.error('ERROR JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        throw error;
      }

      // Se chegamos aqui, a inserção foi um sucesso
      const newTaskForState: Task = {
        id: Math.random().toString(36).substring(2, 9), // ID temporário até o próximo refresh
        title: taskData.title,
        description: taskData.description,
        date: taskData.date,
        technicianId: taskData.technician_id,
        technicianName: taskData.technician_name,
        priority: taskData.priority as any,
        status: taskData.status as any,
        type: taskData.type as any,
        osId: taskData.os_id,
        osNumber: taskData.os_number,
        createdAt: new Date().toISOString(),
        createdBy: taskData.user_id
      };

      setTasks(prev => [newTaskForState, ...prev].sort((a, b) => a.date.localeCompare(b.date)));
      onShowToast('Tarefa criada com sucesso!');
      setIsNewTaskModalOpen(false);
      
      // Limpa o formulário
      setNewTask({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        technicianId: '',
        priority: 'Média',
        type: 'manual',
        osId: ''
      });
    } catch (error: any) {
      console.error('Error creating task (FULL OBJECT):', error);
      
      // Tenta extrair a mensagem de todas as formas possíveis
      let errorMsg = '';
      if (typeof error === 'string') errorMsg = error;
      else if (error.message) errorMsg = error.message;
      else if (error.details) errorMsg = error.details;
      else if (error.hint) errorMsg = error.hint;
      else errorMsg = JSON.stringify(error);

      // Se o erro vier vazio {}, pode ser um erro de segurança/schema não capturado
      if (errorMsg === '{}' || !errorMsg) {
        errorMsg = "Erro de permissão ou Colunas Faltantes. Verifique se aplicou o script SQL na tabela 'agenda'.";
      }
      
      onShowToast(`Erro ao criar tarefa: ${errorMsg}`);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'Pendente' | 'Em andamento' | 'Concluída') => {
    try {
      const { error } = await supabase
        .from('agenda')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('company_id', profile.company_id);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      onShowToast(`Tarefa marcada como ${newStatus.toLowerCase()}`);
    } catch (error: any) {
      console.error('Error updating task:', error);
      onShowToast(`Erro ao atualizar status: ${error.message || ''}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Tarefa',
      message: 'Deseja realmente excluir esta tarefa? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('agenda')
            .delete()
            .eq('id', taskId)
            .eq('company_id', profile.company_id);
          if (error) throw error;
          setTasks(prev => prev.filter(t => t.id !== taskId));
          onShowToast('Tarefa excluída');
          setConfirmModal(null);
        } catch (error: any) {
          console.error('Error deleting task:', error);
          onShowToast(`Erro ao excluir: ${error.message || ''}`);
        }
      }
    });
  };

  const canCreateTask = profile.type === 'ADM' || profile.type === 'Atendente';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans overflow-x-hidden">
      <header className="bg-[#050505] border-b border-zinc-800/80 p-4 sm:p-5 sticky top-0 z-20 backdrop-blur-3xl">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 sm:px-4 sm:py-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-sm sm:rounded-sm transition-all group flex items-center gap-2"
            >
              <ArrowLeft size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white hidden sm:inline">Voltar</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Calendar className="text-blue-500" size={20} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight">Agenda Técnico</h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Painel de Atribuições</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {canCreateTask && (
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black font-black rounded-sm uppercase text-[10px] tracking-widest transition-all shadow-[0_0_20px_rgba(0,230,118,0.15)] active:scale-95"
              >
                <Plus size={14} strokeWidth={3} />
                Nova Tarefa
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-32">
        {/* Filters Bar */}
        <div className="bg-[#050505] border border-zinc-800/40 rounded-sm p-2 flex flex-col lg:flex-row gap-2 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
          <div className="relative flex-1 flex items-center bg-zinc-950 border border-zinc-800/50 rounded-sm px-4 focus-within:border-blue-500/30 transition-colors shadow-inner">
            <Search className="text-zinc-600 shrink-0" size={18} />
            <input 
              type="text" 
              placeholder="PESQUISAR TAREFAS, OS..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none px-3 py-4 text-xs font-black uppercase text-white focus:outline-none focus:ring-0 placeholder:text-zinc-700"
            />
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-8">
            {/* Quick Date Filters */}
            <div className="flex items-center gap-2 bg-[#050505] p-1.5 rounded-sm border border-zinc-800/50">
              <button 
                onClick={() => setFilterDate(todayStr)}
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${filterDate === todayStr ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-zinc-500 hover:text-white'}`}
              >
                Hoje
              </button>
              <button 
                onClick={() => setFilterDate(tomorrowStr)}
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${filterDate === tomorrowStr ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-zinc-500 hover:text-white'}`}
              >
                Amanhã
              </button>
              <button 
                onClick={() => setFilterDate('')}
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${filterDate === '' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                Tudo
              </button>
            </div>

            <div className="flex flex-1 flex-col sm:flex-row gap-2">
              {/* Custom Date Picker */}
              <div className="relative flex items-center bg-[#050505] border border-zinc-800/50 rounded-sm overflow-hidden focus-within:border-blue-500/30 transition-shadow shadow-inner sm:w-44">
                <Calendar size={14} className="absolute left-4 text-zinc-600 pointer-events-none" />
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-full bg-transparent border-none pl-11 pr-4 py-4 text-[10px] font-black uppercase text-white focus:outline-none [color-scheme:dark] cursor-pointer"
                />
              </div>

              {/* Technician Filter */}
              <div className="relative flex items-center bg-[#050505] border border-zinc-800/50 rounded-sm sm:w-48">
                <Filter size={14} className="absolute left-4 text-zinc-600 pointer-events-none" />
                <select 
                  value={filterTechnician}
                  onChange={e => setFilterTechnician(e.target.value)}
                  className="w-full bg-transparent border-none pl-11 pr-4 py-4 text-[10px] font-black uppercase text-white focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="ALL" className="bg-zinc-900 text-white">Time</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id} className="bg-zinc-900 text-white">{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative flex items-center bg-[#050505] border border-zinc-800/50 rounded-sm sm:w-44">
                <Activity size={14} className="absolute left-4 text-zinc-600 pointer-events-none" />
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-transparent border-none pl-11 pr-4 py-4 text-[10px] font-black uppercase text-white focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="ALL" className="bg-zinc-900 text-white">Status</option>
                  <option value="Pendente" className="bg-zinc-900 text-zinc-300">Pendentes</option>
                  <option value="Em andamento" className="bg-zinc-900 text-blue-300">Fazendo</option>
                  <option value="Concluída" className="bg-zinc-900 text-emerald-300">Concluídas</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-500 gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase animate-pulse">Sincronizando Agenda...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-[#050505] border border-zinc-800/40 border-dashed rounded-sm text-zinc-500">
              <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-4">
                <ClipboardList size={32} className="opacity-40" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600 mt-2">Nenhuma tarefa localizada</p>
              {filterDate && (
                <button 
                  onClick={() => setFilterDate('')}
                  className="mt-6 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4"
                >
                  Ver tarefas de outros dias
                </button>
              )}
            </div>
          ) : (
            Object.entries(groupedTasks).map(([techId, techTasks]) => {
              const technician = profiles.find(p => p.id === techId);
              
              return (
                <div key={techId} className="space-y-6">
                  {/* Technician Header Section */}
                  <div className="flex items-center gap-4 bg-[#050505] p-4 rounded-sm border border-zinc-800/50 shadow-lg relative overflow-hidden group">
                    <div className="absolute opacity-10 blur-xl w-32 h-32 bg-blue-500 top-1/2 -translate-y-1/2 left-0 pointer-events-none group-hover:scale-110 transition-transform"></div>
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-sm border-2 border-zinc-800 overflow-hidden bg-zinc-900 flex items-center justify-center group-hover:border-blue-500/50 transition-colors">
                      {technician?.photo ? (
                        <img src={technician.photo} alt={technician.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0 relative z-10 flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                        {technician?.name || 'Técnico Externo'}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          {techTasks.length} {techTasks.length === 1 ? 'Tarefa Atribuída' : 'Tarefas Atribuídas'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {techTasks.map(task => {
                      const priority = PRIORITY_CONFIG[task.priority];
                      const status = STATUS_CONFIG[task.status];
                      const StatusIcon = status.icon;
                      const order = orders.find(o => o.id === task.osId);
                      const customer = order ? customers.find(c => c.id === order.customerId) : null;

                      return (
                        <motion.div 
                          layout
                          key={task.id}
                          className={`bg-[#050505] border ${status.border} rounded-sm overflow-hidden hover:border-zinc-700/80 transition-all group shadow-sm flex flex-col sm:flex-row sm:items-center relative`}
                        >
                          {/* Background Tint */}
                          <div className={`absolute inset-0 ${status.bg} opacity-[0.08] pointer-events-none`}></div>

                          {/* Status Indicator Bar (Left) */}
                          <div className={`absolute top-0 left-0 w-full h-[3px] sm:w-[6px] sm:h-full ${status.bg.replace('/10', '')} opacity-60 shadow-[0_0_15px_currentColor]`}></div>

                          {/* Priority Indicator (Small dot near title) */}
                          <div className={`absolute top-4 right-4 sm:top-auto sm:bottom-4 sm:left-4 w-1.5 h-1.5 rounded-full ${priority.dot} shadow-[0_0_5px_currentColor] opacity-50`}></div>

                          {/* Task Main Info */}
                          <div 
                            onClick={() => setSelectedTask(task)}
                            className="flex-1 p-5 sm:px-8 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:bg-white/[0.03] relative z-10"
                          >
                            {/* Title & Description Column */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-white text-sm sm:text-base truncate">{task.title}</h3>
                                {task.type === 'os' && (
                                  <span className="shrink-0 bg-[#00E676]/10 text-[#00E676] text-[8px] font-black px-2 py-0.5 rounded-md border border-[#00E676]/20 uppercase tracking-tighter shadow-inner">
                                    OS {task.osNumber?.toString().padStart(4, '0')}
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-zinc-500 line-clamp-1 font-medium italic opacity-80 pr-4">
                                  {task.description}
                                </p>
                              )}
                              {task.type === 'os' && order && (
                                <div className="flex items-center gap-3 mt-1.5 opacity-60">
                                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                    <Wrench size={10} /> {order.equipment.brand} {order.equipment.model}
                                  </p>
                                  <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                    {customer?.name || 'Cliente Avulso'}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Status & Date Column */}
                            <div className="flex items-center gap-4 sm:ml-auto">
                              <div className="flex flex-col items-end gap-1.5">
                                <div className={`px-3 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-inner ${status.bg} ${status.color} border-${status.color.replace('text-', '')}/20`}>
                                  <StatusIcon size={12} strokeWidth={2.5} />
                                  {task.status}
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                                  <Calendar size={11} />
                                  {new Date(task.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions Footer/Bar */}
                          <div className="bg-[#0A0A0A] sm:bg-transparent border-t sm:border-t-0 sm:border-l border-zinc-800/60 p-4 sm:p-5 flex items-center justify-between sm:justify-start gap-4">
                            <div className="flex items-center gap-2">
                              {profile.id === task.technicianId ? (
                                <>
                                  {task.status === 'Pendente' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(task.id, 'Em andamento')}
                                      className="flex items-center justify-center p-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-sm transition-all border border-blue-500/20 active:scale-90"
                                      title="Iniciar"
                                    >
                                      <Play size={16} fill="currentColor" />
                                    </button>
                                  )}
                                  {task.status === 'Em andamento' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(task.id, 'Concluída')}
                                      className="flex items-center justify-center p-2.5 bg-[#00E676]/10 hover:bg-[#00E676] text-[#00E676] hover:text-black rounded-sm transition-all border border-[#00E676]/20 active:scale-90 shadow-lg shadow-[#00E676]/10"
                                      title="Concluir"
                                    >
                                      <Check size={18} strokeWidth={3} />
                                    </button>
                                  )}
                                  {task.status === 'Concluída' && (
                                    <div className="p-2 text-emerald-500 bg-emerald-500/10 rounded-sm border border-emerald-500/20">
                                      <CheckCircle2 size={18} strokeWidth={2.5} />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="p-2 text-zinc-700 bg-zinc-900 rounded-sm" title="Somente o técnico atribuído pode alterar">
                                  <Clock size={16} />
                                </div>
                              )}
                            </div>

                            {canCreateTask && (
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-2.5 bg-transparent hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-sm transition-all active:scale-95 sm:ml-1"
                                title="Excluir"
                              >
                                <X size={18} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* New Task Modal */}
      <AnimatePresence>
        {isNewTaskModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#101010] border border-zinc-800 rounded-sm w-full max-w-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh]"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00E676]/10 text-[#00E676] rounded-sm flex items-center justify-center border border-[#00E676]/20 shadow-inner">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">Nova Tarefa</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Agendar para Técnico</p>
                  </div>
                </div>
                <button onClick={() => setIsNewTaskModalOpen(false)} className="p-3 hover:bg-zinc-800 rounded-full transition-all text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Título da Tarefa</label>
                      <input 
                        required
                        type="text" 
                        value={newTask.title}
                        onChange={e => setNewTask({...newTask, title: capFirst(e.target.value)})}
                        className="w-full bg-[#050505] border border-zinc-800/80 rounded-sm px-5 py-4 text-xs font-bold focus:outline-none focus:border-[#00E676]/50 transition-all placeholder:text-zinc-700 text-white shadow-inner"
                        placeholder="Ex: Revisar reparo pendente"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descrição</label>
                      <textarea 
                        value={newTask.description}
                        onChange={e => setNewTask({...newTask, description: capFirst(e.target.value)})}
                        className="w-full bg-[#050505] border border-zinc-800/80 rounded-sm px-5 py-4 text-xs font-bold focus:outline-none focus:border-[#00E676]/50 transition-all h-32 resize-none placeholder:text-zinc-700 text-white shadow-inner leading-relaxed"
                        placeholder="Descreva detalhadamente o que deve ser feito..."
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data</label>
                        <input 
                          required
                          type="date" 
                          value={newTask.date}
                          onChange={e => setNewTask({...newTask, date: e.target.value})}
                          className="w-full bg-[#050505] border border-zinc-800/80 rounded-sm px-5 py-4 text-xs font-bold focus:outline-none focus:border-[#00E676]/50 transition-all text-white shadow-inner [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Prioridade</label>
                        <select 
                          value={newTask.priority}
                          onChange={e => setNewTask({...newTask, priority: e.target.value as 'Baixa' | 'Média' | 'Alta'})}
                          className="w-full bg-[#050505] border border-zinc-800/80 rounded-sm px-5 py-4 text-xs font-bold focus:outline-none focus:border-[#00E676]/50 transition-all text-white shadow-inner cursor-pointer"
                        >
                          <option value="Baixa">🟢 Baixa</option>
                          <option value="Média">🟡 Média</option>
                          <option value="Alta">🔴 Alta</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Técnico Responsável</label>
                      <select 
                        required
                        value={newTask.technicianId}
                        onChange={e => setNewTask({...newTask, technicianId: e.target.value})}
                        className="w-full bg-[#050505] border border-zinc-800/80 rounded-sm px-5 py-4 text-xs font-bold focus:outline-none focus:border-[#00E676]/50 transition-all text-white shadow-inner cursor-pointer"
                      >
                        <option value="">Selecionar técnico...</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Vincular à uma OS?</label>
                      <div className="flex bg-[#050505] border border-zinc-800/80 p-1 rounded-sm shadow-inner">
                        <button 
                          type="button"
                          onClick={() => setNewTask({...newTask, type: 'manual'})}
                          className={`flex-1 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${newTask.type === 'manual' ? 'bg-zinc-800 text-white shadow-lg' : 'bg-transparent text-zinc-600 hover:text-zinc-400'}`}
                        >
                          Não
                        </button>
                        <button 
                          type="button"
                          onClick={() => setNewTask({...newTask, type: 'os'})}
                          className={`flex-1 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${newTask.type === 'os' ? 'bg-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.2)]' : 'bg-transparent text-zinc-600 hover:text-zinc-400'}`}
                        >
                          Sim (OS)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {newTask.type === 'os' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 pt-2"
                  >
                    <label className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.2em] ml-1">Buscar Ordem de Serviço</label>
                    <select 
                      required
                      value={newTask.osId}
                      onChange={e => setNewTask({...newTask, osId: e.target.value})}
                      className="w-full bg-[#00E676]/5 border border-[#00E676]/30 rounded-sm px-5 py-4 text-[11px] font-bold text-white focus:outline-none focus:border-[#00E676] transition-all"
                    >
                      <option value="" className="bg-black text-zinc-500">Selecionar OS...</option>
                      {orders.map(o => {
                        const customer = customers.find(c => c.id === o.customerId);
                        return (
                          <option key={o.id} value={o.id} className="bg-[#141414] text-white">
                            OS {o.osNumber.toString().padStart(4, '0')} | {o.equipment.brand} {o.equipment.model} {customer ? `(${customer.name})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </motion.div>
                )}

                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00C853] hover:to-[#00B24A] text-black font-black uppercase tracking-[0.3em] text-[10px] py-5 rounded-sm transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-[0_15px_40px_rgba(0,230,118,0.2)] hover:shadow-[#00E676]/40 flex items-center justify-center gap-3"
                  >
                    <Check size={18} strokeWidth={3} />
                    Confirmar Agendamento
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-zinc-800 rounded-sm p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-sm flex items-center justify-center mb-4 text-red-500">
                <X size={24} strokeWidth={3} />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{confirmModal.title}</h3>
              <p className="text-zinc-500 text-xs font-medium mb-8 leading-relaxed max-w-[250px] mx-auto">{confirmModal.message}</p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-[#1A1A1A] hover:bg-zinc-800 text-white py-3.5 rounded-sm text-[10px] uppercase tracking-widest font-black transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-sm text-[10px] uppercase tracking-widest font-black transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Task Details Modal */}
      <AnimatePresence>
        {selectedTask && (() => {
          const priority = PRIORITY_CONFIG[selectedTask.priority];
          const status = STATUS_CONFIG[selectedTask.status];
          const StatusIcon = status.icon;
          const order = orders.find(o => o.id === selectedTask.osId);
          const customer = order ? customers.find(c => c.id === order.customerId) : null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#101010] border border-zinc-800 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/50">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-sm text-[9px] font-black uppercase tracking-[0.2em] ${priority.bg} ${priority.color} border ${priority.border} shadow-inner`}>
                        {selectedTask.priority}
                      </div>
                      <div className={`px-2.5 py-1 rounded-sm text-[9px] font-black uppercase tracking-[0.2em] ${status.bg} ${status.color} border border-${status.color.replace('text-', '')}/20 flex items-center gap-1 shadow-inner`}>
                        <StatusIcon size={12} strokeWidth={2.5} />
                        {selectedTask.status}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white mb-2 leading-tight">{selectedTask.title}</h2>
                      <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {new Date(selectedTask.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <div className="flex items-center gap-1.5">
                          <User size={14} />
                          {selectedTask.technicianName}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-2.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white shrink-0"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                  {selectedTask.description && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        Descrição da Tarefa
                      </label>
                      <div className="bg-[#050505] border border-zinc-800/80 p-5 rounded-sm text-zinc-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-inner">
                        {selectedTask.description}
                      </div>
                    </div>
                  )}

                  {selectedTask.type === 'os' && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00E676]"></div>
                        Vínculo de Ordem de Serviço
                      </label>
                      <div className="bg-gradient-to-br from-[#00E676]/10 to-transparent border border-[#00E676]/20 rounded-sm p-6 relative overflow-hidden group">
                        <div className="absolute -right-8 -top-8 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                          <Wrench size={160} />
                        </div>
                        <div className="relative flex flex-col gap-5 z-10">
                          <div className="flex items-center justify-between">
                            <span className="bg-[#00E676] text-black text-[10px] font-black px-4 py-1.5 rounded-sm uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(0,230,118,0.3)]">
                              OS {selectedTask.osNumber?.toString().padStart(5, '0')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 p-3 rounded-sm border border-white/5">
                              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1 pb-1 border-b border-white/5">Aparelho</p>
                              <p className="text-xs text-white font-bold truncate">{order?.equipment.brand} {order?.equipment.model}</p>
                            </div>
                            <div className="bg-black/40 p-3 rounded-sm border border-white/5">
                              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1 pb-1 border-b border-white/5">Cliente</p>
                              <p className="text-xs text-white font-bold truncate">{customer?.name || 'Avulso'}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if (order) {
                                onOpenOsStatus(order);
                                setSelectedTask(null);
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black text-[10px] tracking-[0.2em] uppercase font-black py-4 rounded-sm transition-all shadow-lg hover:shadow-[#00E676]/40 active:scale-[0.98]"
                          >
                            Abrir OS Completa
                            <ArrowLeft size={16} className="rotate-180" strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer / Actions */}
                <div className="p-6 sm:p-8 bg-zinc-950/80 border-t border-zinc-800 flex gap-4 shrink-0">
                  {profile.id === selectedTask.technicianId ? (
                    <>
                      {selectedTask.status === 'Pendente' && (
                        <button 
                          onClick={() => {
                            handleUpdateStatus(selectedTask.id, 'Em andamento');
                            setSelectedTask(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-widest py-4 rounded-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                          <Play size={16} fill="currentColor" />
                          Iniciar Execução
                        </button>
                      )}
                      {selectedTask.status === 'Em andamento' && (
                        <button 
                          onClick={() => {
                            handleUpdateStatus(selectedTask.id, 'Concluída');
                            setSelectedTask(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00C853] text-black font-black text-[11px] uppercase tracking-widest py-4 rounded-sm transition-all shadow-lg shadow-[#00E676]/20 active:scale-95"
                        >
                          <Check size={18} strokeWidth={3} />
                          Finalizar Tarefa
                        </button>
                      )}
                      {selectedTask.status === 'Concluída' && (
                        <div className="flex-1 py-4 text-center text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] bg-emerald-400/5 border border-emerald-400/20 rounded-sm flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} />
                          Atividade Finalizada
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 py-5 bg-zinc-950 border border-zinc-800/80 rounded-sm text-center flex flex-col items-center justify-center gap-1">
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Filter size={12} /> Acesso Restrito
                      </p>
                      <p className="text-[10px] text-zinc-500 font-bold px-4">Autorização exclusiva para {selectedTask.technicianName}.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
