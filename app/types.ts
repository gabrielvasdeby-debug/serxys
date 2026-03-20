export type OrderStatus = 'Entrada Registrada' | 'Orçamento em Elaboração' | 'Em Análise Técnica' | 'Aguardando Aprovação' | 'Aguardando Peça' | 'Em Manutenção' | 'Reparo Concluído' | 'Equipamento Retirado' | 'Orçamento Cancelado' | 'Sem Reparo' | 'Garantia';
export type OrderPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

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
  warrantyDescription?: string;
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
  checklistNotes: string;
  defect: string;
  technicianNotes: string;
  service: string;
  financials: {
    totalValue: number;
    paymentType: 'Dinheiro' | 'PIX' | 'Cartão' | 'Transferência' | 'Outro' | '';
    paymentStatus: 'Total' | 'Parcial' | 'Pendente';
    amountPaid: number;
  };
  signatures: {
    technician: string | null;
    client: string | null;
  };
  status: OrderStatus;
  priority: OrderPriority;
  history: OrderHistoryEvent[];
  completionData?: OrderCompletionData;
  productsUsed?: { id: string, name: string, quantity: number, price: number }[];
  createdAt: string;
  updatedAt: string;
}
