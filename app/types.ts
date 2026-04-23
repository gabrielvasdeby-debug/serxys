export type OrderStatus = 'Entrada' | 'Orçamento em Elaboração' | 'Em Análise Técnica' | 'Aguardando Aprovação' | 'Aguardando Peça' | 'Em Manutenção' | 'Reparo Concluído' | 'Equipamento Retirado' | 'Orçamento Cancelado' | 'Sem Reparo';
export type OrderPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export type View = 'LOGIN' | 'REGISTER' | 'PROFILES' | 'PIN_ENTRY' | 'DASHBOARD' | 'SETTINGS' | 'CREATE_PROFILE' | 'CREATE_PIN' | 'CLIENTES' | 'NOVA_OS' | 'STATUS_OS' | 'CAIXA' | 'PRODUTOS' | 'FINANCEIRO' | 'AGENDA' | 'RELATORIOS' | 'SERVICOS' | 'FORNECEDORES' | 'GARANTIA' | 'RELACIONAMENTO';

export type ProfileType = 'ADM' | 'Técnico' | 'Atendente' | 'Financeiro';

export interface Product {
  id: string;
  companyId?: string;
  name: string;
  stock: number;
  minStock: number;
  image?: string;
  category?: string;
  description?: string;
  barcode?: string;
  brand?: string;
  model?: string;
  price?: number;
  costPrice?: number;
  ncm?: string;
  sku?: string;
  location?: string;
  unit?: string;
  warrantyDays?: number;
  allowNegativeStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  profile_id: string;
  module: string;
  action: string;
  details: any;
  created_at: string;
  profile?: Profile;
}

export interface Profile {
  id: string;
  name: string;
  type: ProfileType;
  role: string;
  photo: string;
  company_id: string;
  permissions?: string[];
  pin?: string;
  email?: string;
  [key: string]: any;
}

export interface CompanySettings {
  name: string;
  cnpj: string;
  whatsapp: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
  zipCode: string;
  logoUrl: string;
  publicSlug: string;
  slugHistory: string[];
  followUpMessage: string;
}

export interface OsSettings {
  nextOsNumber: number;
  checklistItems: string[];
  checklistByCategory: Record<string, string[]>;
  printTerms: string;
  warrantyTerms?: string;
  printFooter?: string;
  whatsappMessages: Record<string, string>;
}

export interface OrderHistoryEvent {
  date: string;
  user: string;
  description: string;
}

export interface OrderCompletionData {
  servicesPerformed: string;
  exitChecklist: Record<string, 'works' | 'broken' | 'untested'>;
  supplier: string;
  partsUsed: string;
  warrantyDays?: number;
  warrantyMonths?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyTerms?: string;
  technicianObservations?: string;
  confirmationChecklist?: {
    testedAndApproved: boolean;
    workingCorrectly: boolean;
    customerAware: boolean;
  };
  signatures?: {
    technician: string | null;
    client: string | null;
  };
  hasWarranty?: boolean;
  completionDate?: string;
}

export interface BudgetItem {
  id: string;
  type: 'service' | 'part';
  description: string;
  quantity: number;
  price: number | string;
}

export interface BudgetData {
  items: BudgetItem[];
  totalValue: number;
  status: 'Aguardando Aprovação' | 'Aprovado' | 'Recusado' | 'Em Elaboração';
  updatedAt?: string;
  detailedDefect?: string;
  requiredService?: string;
  serviceNotes?: string;
  photos?: string[];
  clientSignature?: string;
  approvalDate?: string;
}

export interface TechnicalReport {
  diagnosis: string;
  tests: string;
  partsNeeded: string;
  notes: string;
  conclusion: string;
  technicianSignature?: string;
  photos?: string[];
  createdAt?: string;
}

export interface Order {
  id: string;
  companyId: string;
  osNumber: number;
  customerId: string;
  equipment: {
    type: string;
    brand: string;
    model: string;
    serial: string;
    color: string;
    passwordType: 'text' | 'pattern' | 'none';
    passwordValue: string;
  };
  checklist: Record<string, 'works' | 'broken' | 'untested'>;
  checklistNotPossible?: boolean;
  entryPhotos?: string[];
  checklistNotes: string;
  defect: string;
  technicianNotes: string;
  service: string;
  financials: {
    totalValue: number;
    paymentType: 'Dinheiro' | 'PIX' | 'Cartão' | 'Transferência' | 'Débito' | 'Crédito' | 'Link' | 'Outro' | '';
    paymentStatus: 'Total' | 'Parcial' | 'Pendente';
    amountPaid: number;
  };
  signatures: {
    technician: string | null;
    client: string | null;
    isManual?: boolean;
    mode?: 'digital' | 'manual' | 'remote';
  };
  status: OrderStatus;
  priority: OrderPriority;
  history: OrderHistoryEvent[];
  completionData?: OrderCompletionData;
  technicalReport?: TechnicalReport;
  budget?: BudgetData;
  productsUsed?: { id: string, name: string, quantity: number, price: number }[];
  isVisualChecklist?: boolean;
  deliveryForecast?: string;
  scannedOsUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'DANGER';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  moduleId?: string;
  entityId?: string;
}
