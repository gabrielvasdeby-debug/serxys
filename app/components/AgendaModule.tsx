'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Calendar, User, Clock, CheckCircle2, 
  Filter, Search, X, 
  ClipboardList, Wrench, 
  Check, Play, Pause
} from 'lucide-react';
import { db, auth } from '../firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  updateDoc, doc, deleteDoc
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Order } from './OrdemServicoModule';

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

interface Profile {
  id: string;
  name: string;
  type: 'ADM' | 'Técnico' | 'Atendente' | 'Financeiro';
  photo: string;
}

interface AgendaModuleProps {
  profile: Profile;
  profiles: Profile[];
  orders: Order[];
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
  'Pendente': { color: 'text-zinc-400', bg: 'bg-zinc-400/10', icon: Clock },
  'Em andamento': { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Play },
  'Concluída': { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 }
};

export default function AgendaModule({
  profile,
  profiles,
  orders,
  onBack,
  onShowToast,
  onOpenOsStatus
}: AgendaModuleProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
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
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!auth.currentUser) return;
    const q = query(collection(db, 'tasks'), orderBy('date', 'asc'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(tasksList);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesTechnician = filterTechnician === 'ALL' || t.technicianId === filterTechnician;
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const matchesDate = !filterDate || t.date === filterDate;
      const matchesSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.osNumber?.toString().includes(searchQuery);
      
      return matchesTechnician && matchesStatus && matchesDate && matchesSearch;
    });
  }, [tasks, filterTechnician, filterStatus, filterDate, searchQuery]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.technicianId || !newTask.date) {
      onShowToast('Preencha todos os campos obrigatórios');
      return;
    }

    const technician = profiles.find(p => p.id === newTask.technicianId);
    const linkedOs = newTask.type === 'os' ? orders.find(o => o.id === newTask.osId) : null;

    const taskData: any = {
      title: newTask.title,
      description: newTask.description || '',
      date: newTask.date,
      technicianId: newTask.technicianId,
      technicianName: technician?.name || 'Técnico',
      priority: newTask.priority,
      status: 'Pendente',
      type: newTask.type,
      createdAt: new Date().toISOString(),
      createdBy: profile.id
    };

    if (newTask.type === 'os') {
      if (newTask.osId) taskData.osId = newTask.osId;
      if (linkedOs?.osNumber) taskData.osNumber = linkedOs.osNumber;
    }

    try {
      await addDoc(collection(db, 'tasks'), taskData);
      onShowToast('Tarefa criada com sucesso');
      setIsNewTaskModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        technicianId: '',
        priority: 'Média',
        type: 'manual',
        osId: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'Pendente' | 'Em andamento' | 'Concluída') => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      onShowToast(`Tarefa marcada como ${newStatus.toLowerCase()}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Tarefa',
      message: 'Deseja realmente excluir esta tarefa? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'tasks', taskId));
          onShowToast('Tarefa excluída');
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
        }
      }
    });
  };

  const canCreateTask = profile.type === 'ADM' || profile.type === 'Atendente';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <header className="bg-[#141414] border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-zinc-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Agenda Técnico</h1>
              <p className="text-sm text-zinc-400">Gerenciamento de tarefas e compromissos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {canCreateTask && (
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="bg-[#00E676] text-black px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#00C864] transition-all shadow-lg shadow-[#00E676]/20"
              >
                <Plus size={18} />
                Nova Tarefa
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Filters Bar */}
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar tarefas..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#00E676] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-zinc-500" />
            <select 
              value={filterTechnician}
              onChange={e => setFilterTechnician(e.target.value)}
              className="bg-[#0A0A0A] border border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00E676]"
            >
              <option value="ALL">Todos os Técnicos</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#0A0A0A] border border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00E676]"
            >
              <option value="ALL">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluída">Concluída</option>
            </select>

            <input 
              type="date" 
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="bg-[#0A0A0A] border border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#00E676]"
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <div className="w-8 h-8 border-2 border-[#00E676] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Carregando tarefas...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#141414] border border-zinc-800 border-dashed rounded-3xl text-zinc-500">
              <ClipboardList size={48} className="mb-4 opacity-20" />
              <p>Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map(task => {
                const priority = PRIORITY_CONFIG[task.priority];
                const status = STATUS_CONFIG[task.status];
                const StatusIcon = status.icon;

                return (
                  <motion.div 
                    layout
                    key={task.id}
                    className="bg-[#141414] border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all group"
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${priority.color}`}>
                              Prioridade {task.priority}
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-lg leading-tight">{task.title}</h3>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${status.bg} ${status.color}`}>
                          <StatusIcon size={12} />
                          {task.status}
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-[#0A0A0A] px-2 py-1 rounded-lg border border-zinc-800">
                          <Calendar size={12} />
                          {new Date(task.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-[#0A0A0A] px-2 py-1 rounded-lg border border-zinc-800">
                          <User size={12} />
                          {task.technicianName}
                        </div>
                        {task.type === 'os' && (
                          <button 
                            onClick={() => {
                              const order = orders.find(o => o.id === task.osId);
                              if (order) onOpenOsStatus(order);
                              else onShowToast('OS não encontrada');
                            }}
                            className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg border border-blue-400/20 hover:bg-blue-400/20 transition-colors"
                          >
                            <Wrench size={12} />
                            OS #{task.osNumber?.toString().padStart(4, '0')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#0A0A0A]/50 border-t border-zinc-800 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {task.status !== 'Concluída' && (
                          <button 
                            onClick={() => handleUpdateStatus(task.id, 'Concluída')}
                            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors border border-emerald-500/20"
                          >
                            <Check size={14} />
                            Concluir
                          </button>
                        )}
                        {task.status === 'Pendente' && (
                          <button 
                            onClick={() => handleUpdateStatus(task.id, 'Em andamento')}
                            className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors border border-blue-500/20"
                          >
                            <Play size={14} />
                            Iniciar
                          </button>
                        )}
                        {task.status === 'Em andamento' && (
                          <button 
                            onClick={() => handleUpdateStatus(task.id, 'Pendente')}
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors border border-zinc-700"
                          >
                            <Pause size={14} />
                            Pausar
                          </button>
                        )}
                      </div>

                      {canCreateTask && (
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold">Nova Tarefa</h2>
                <button onClick={() => setIsNewTaskModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Título da Tarefa</label>
                  <input 
                    required
                    type="text" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-colors"
                    placeholder="Ex: Organizar bancada"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Descrição (Opcional)</label>
                  <textarea 
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-colors h-24 resize-none"
                    placeholder="Detalhes da tarefa..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Data</label>
                    <input 
                      required
                      type="date" 
                      value={newTask.date}
                      onChange={e => setNewTask({...newTask, date: e.target.value})}
                      className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridade</label>
                    <select 
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value as 'Baixa' | 'Média' | 'Alta'})}
                      className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-colors"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Técnico Responsável</label>
                  <select 
                    required
                    value={newTask.technicianId}
                    onChange={e => setNewTask({...newTask, technicianId: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-colors"
                  >
                    <option value="">Selecionar técnico...</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipo de Tarefa</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setNewTask({...newTask, type: 'manual'})}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newTask.type === 'manual' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      Manual
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewTask({...newTask, type: 'os'})}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${newTask.type === 'os' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      Vinculada à OS
                    </button>
                  </div>
                </div>

                {newTask.type === 'os' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Selecionar OS</label>
                    <select 
                      required
                      value={newTask.osId}
                      onChange={e => setNewTask({...newTask, osId: e.target.value})}
                      className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00E676] transition-colors"
                    >
                      <option value="">Selecionar OS...</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>OS #{o.osNumber} - {o.equipment.brand} {o.equipment.model}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-[#00E676] text-black font-bold py-4 rounded-2xl transition-all hover:bg-[#00C864] mt-4 shadow-lg shadow-[#00E676]/20"
                >
                  Criar Tarefa
                </button>
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
              className="bg-[#1A1A1A] border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-zinc-400 text-sm mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
