import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../app/supabase';
import type { Customer } from '../app/components/ClientesModule';
import type { Order } from '../app/types';

export interface OsSettings {
  nextOsNumber: number;
  checklistItems: string[];
  printTerms: string;
  whatsappMessages: Record<string, string>;
}

const DEFAULT_OS_SETTINGS: OsSettings = {
  nextOsNumber: 1,
  checklistItems: ['Carregador', 'Cabo USB', 'Bateria', 'Cartão de Memória', 'Chip', 'Capa Proteção'],
  printTerms: '',
  whatsappMessages: {
    'Entrada Registrada': 'Olá [nome_cliente], sua OS #[numero_os] foi registrada com sucesso. Status: [status].',
    'Em Análise Técnica': 'Olá [nome_cliente], sua OS #[numero_os] está em análise técnica. Status: [status].',
    'Orçamento em Elaboração': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] está em elaboração. Status: [status].',
    'Aguardando Aprovação': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] está aguardando aprovação. Status: [status].',
    'Em Manutenção': 'Olá [nome_cliente], sua OS #[numero_os] está em manutenção. Status: [status].',
    'Reparo Concluído': 'Olá [nome_cliente], o reparo da sua OS #[numero_os] foi concluído. Status: [status].',
    'Orçamento Cancelado': 'Olá [nome_cliente], o orçamento da sua OS #[numero_os] foi cancelado. Status: [status].',
    'Sem Reparo': 'Olá [nome_cliente], sua OS #[numero_os] foi avaliada como sem reparo. Status: [status].'
  }
};

export function useSupabaseData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [osSettings, setOsSettingsState] = useState<OsSettings>(DEFAULT_OS_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Helper: Convert DB row to Customer
  const rowToCustomer = (row: Record<string, unknown>): Customer => ({
    id: row.id as string,
    name: row.name as string,
    birthDate: row.birth_date as string | undefined,
    phone: row.phone as string || '',
    whatsapp: row.whatsapp as string || '',
    email: row.email as string || '',
    document: row.document as string || '',
    address: (row.address as Customer['address']) || { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
    notes: row.notes as string || '',
    createdAt: row.created_at as string || new Date().toISOString(),
    devices: (row.devices as Customer['devices']) || [],
  });

  // Helper: Convert DB row to Order
  const rowToOrder = (row: Record<string, unknown>): Order => ({
    id: row.id as string,
    companyId: row.company_id as string,
    osNumber: row.os_number as number,
    customerId: row.customer_id as string,
    equipment: row.equipment as Order['equipment'],
    checklist: row.checklist as Order['checklist'],
    checklistNotes: row.checklist_notes as string || '',
    defect: row.defect as string || '',
    technicianNotes: row.technician_notes as string || '',
    service: row.service as string || '',
    financials: row.financials as Order['financials'],
    signatures: row.signatures as Order['signatures'],
    status: row.status as Order['status'],
    priority: row.priority as Order['priority'],
    history: (row.history as Order['history']) || [],
    completionData: row.completion_data as Order['completionData'],
    productsUsed: (row.products_used as Order['productsUsed']) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  });

  // Load all data from Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [customersRes, ordersRes, settingsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').eq('key', 'os_settings').single(),
      ]);

      if (customersRes.data) {
        setCustomers(customersRes.data.map(rowToCustomer));
      }

      if (ordersRes.data) {
        setOrders(ordersRes.data.map(rowToOrder));
      }

      if (settingsRes.data?.value) {
        const saved = settingsRes.data.value as Partial<OsSettings>;
        setOsSettingsState({
          ...DEFAULT_OS_SETTINGS,
          ...saved,
          whatsappMessages: {
            ...DEFAULT_OS_SETTINGS.whatsappMessages,
            ...(saved.whatsappMessages || {}),
          }
        });
      }
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================
  // Customers CRUD
  // ============================
  const saveCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const row = {
      id,
      name: customerData.name,
      birth_date: customerData.birthDate || null,
      phone: customerData.phone,
      whatsapp: customerData.whatsapp,
      email: customerData.email,
      document: customerData.document,
      address: customerData.address,
      notes: customerData.notes,
      devices: customerData.devices || [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase.from('customers').insert(row).select().single();
    if (error) { console.error('Error saving customer:', error); return null; }

    const customer = rowToCustomer(data as Record<string, unknown>);
    setCustomers(prev => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
    return customer;
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>): Promise<boolean> => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (customerData.name !== undefined) row.name = customerData.name;
    if (customerData.birthDate !== undefined) row.birth_date = customerData.birthDate;
    if (customerData.phone !== undefined) row.phone = customerData.phone;
    if (customerData.whatsapp !== undefined) row.whatsapp = customerData.whatsapp;
    if (customerData.email !== undefined) row.email = customerData.email;
    if (customerData.document !== undefined) row.document = customerData.document;
    if (customerData.address !== undefined) row.address = customerData.address;
    if (customerData.notes !== undefined) row.notes = customerData.notes;
    if (customerData.devices !== undefined) row.devices = customerData.devices;

    const { error } = await supabase.from('customers').update(row).eq('id', id);
    if (error) { console.error('Error updating customer:', error); return false; }

    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...customerData } : c));
    return true;
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) { console.error('Error deleting customer:', error); return false; }
    setCustomers(prev => prev.filter(c => c.id !== id));
    return true;
  };

  // ============================
  // Orders CRUD
  // ============================
  const saveOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order | null> => {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const row = {
      id,
      os_number: orderData.osNumber,
      customer_id: orderData.customerId,
      equipment: orderData.equipment,
      checklist: orderData.checklist,
      checklist_notes: orderData.checklistNotes,
      defect: orderData.defect,
      technician_notes: orderData.technicianNotes,
      service: orderData.service,
      financials: orderData.financials,
      signatures: orderData.signatures,
      status: orderData.status,
      priority: orderData.priority,
      history: orderData.history,
      completion_data: orderData.completionData || null,
      products_used: orderData.productsUsed || [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase.from('orders').insert(row).select().single();
    if (error) { console.error('Error saving order:', error); return null; }

    const order = rowToOrder(data as Record<string, unknown>);
    setOrders(prev => [order, ...prev]);
    return order;
  };

  const updateOrder = async (id: string, orderData: Partial<Order>): Promise<boolean> => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (orderData.status !== undefined) row.status = orderData.status;
    if (orderData.priority !== undefined) row.priority = orderData.priority;
    if (orderData.history !== undefined) row.history = orderData.history;
    if (orderData.financials !== undefined) row.financials = orderData.financials;
    if (orderData.technicianNotes !== undefined) row.technician_notes = orderData.technicianNotes;
    if (orderData.defect !== undefined) row.defect = orderData.defect;
    if (orderData.service !== undefined) row.service = orderData.service;
    if (orderData.completionData !== undefined) row.completion_data = orderData.completionData;
    if (orderData.productsUsed !== undefined) row.products_used = orderData.productsUsed;
    if (orderData.signatures !== undefined) row.signatures = orderData.signatures;

    const { error } = await supabase.from('orders').update(row).eq('id', id);
    if (error) { console.error('Error updating order:', error); return false; }

    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...orderData } : o));
    return true;
  };

  const deleteOrder = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) { console.error('Error deleting order:', error); return false; }
    setOrders(prev => prev.filter(o => o.id !== id));
    return true;
  };

  // ============================
  // OS Settings
  // ============================
  const setOsSettings = async (newSettings: OsSettings) => {
    setOsSettingsState(newSettings);
    await supabase.from('app_settings').upsert({
      key: 'os_settings',
      value: newSettings,
      updated_at: new Date().toISOString(),
    });
  };

  return {
    customers,
    setCustomers,
    orders,
    setOrders,
    osSettings,
    setOsSettings,
    loading,
    loadData,
    // Customer methods
    saveCustomer,
    updateCustomer,
    deleteCustomer,
    // Order methods
    saveOrder,
    updateOrder,
    deleteOrder,
  };
}
