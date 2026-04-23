import { ProfileType } from './types';

export const DEFAULT_PERMISSIONS: Record<ProfileType, string[]> = {
  'ADM': ['nova_os', 'status_os', 'clientes', 'garantia', 'produtos', 'servicos', 'caixa', 'financeiro', 'fornecedores', 'agenda', 'ajustes', 'relatorios', 'relacionamento'],
  'Financeiro': ['caixa', 'financeiro', 'fornecedores', 'garantia'],
  'Técnico': ['nova_os', 'status_os', 'agenda', 'garantia', 'relacionamento'],
  'Atendente': ['nova_os', 'status_os', 'clientes', 'garantia', 'relacionamento']
};

export const AVAILABLE_MODULES = [
  { id: 'nova_os', name: 'Nova OS' },
  { id: 'status_os', name: 'Status OS' },
  { id: 'clientes', name: 'Clientes' },
  { id: 'garantia', name: 'Garantia' },
  { id: 'produtos', name: 'Produtos' },
  { id: 'servicos', name: 'Serviços' },
  { id: 'caixa', name: 'Caixa' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'fornecedores', name: 'Fornecedores' },
  { id: 'agenda', name: 'Agenda Técnico' },
  { id: 'relacionamento', name: 'Relacionamento' },
  { id: 'ajustes', name: 'Ajustes' },
  { id: 'relatorios', name: 'Relatórios' }
];
