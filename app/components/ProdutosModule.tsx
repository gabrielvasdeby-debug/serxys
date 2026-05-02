'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  Package, Plus, Search, ArrowLeft, 
  AlertTriangle, TrendingUp, ShoppingCart, 
  Barcode, Image as ImageIcon, 
  Edit2, Trash2, Save, X,
  ArrowUpRight, Camera, Info, CheckCircle2,
  Download, Grid, Loader2
} from 'lucide-react';
import { supabase } from '../supabase';
import { Product } from '../types';
import { subDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { capFirst } from '../utils/capFirst';
import InfoTooltip from './InfoTooltip';



interface Sale {
  id: string;
  date: string;
  items: {
    productId: string;
    productName: string;
    productBrand?: string;
    productModel?: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  total: number;
  paymentMethod: string;
  userId: string;
  createdAt: string;
}

interface ProdutosModuleProps {
  profile: {
    id: string;
    name: string;
    role: string;
    type?: string;
    user_id?: string;
    [key: string]: unknown;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onLogActivity?: (module: string, action: string, details: any) => Promise<void>;
}

export default function ProdutosModule({ profile, onBack, onShowToast, products, setProducts, onLogActivity }: ProdutosModuleProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState<'catalog' | 'reports' | 'shoppingList'>('catalog');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [reportPeriod, setReportPeriod] = useState('30'); // days
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  // Permissions
  const isAdmin = profile.type === 'ADM';
  const canEdit = isAdmin;
  const canViewReports = isAdmin;

  // Load ONLY products on mount (fast)
  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (products.length > 0) {
          setLoading(false);
          return;
        }

        const { data: productsRes, error: productsError } = await supabase
          .from('products')
          .select('id, name, brand, model, image, category, description, barcode, price, cost_price, stock, min_stock, created_at, updated_at')
          .eq('company_id', profile.company_id)
          .order('name', { ascending: true });

        if (productsError) throw productsError;
        if (productsRes) {
          setProducts(productsRes.map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand || '',
            model: p.model || '',
            image: p.image,
            category: p.category,
            description: p.description,
            barcode: p.barcode,
            price: p.price || 0,
            costPrice: p.cost_price || 0,
            stock: p.stock || 0,
            minStock: p.min_stock || 0,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          })));
        }
      } catch (error) {
        console.error('Error loading products:', error);
        onShowToast('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Load sales LAZILY — only when user switches to Analytics or Shopping List
  useEffect(() => {
    if ((viewMode === 'reports' || viewMode === 'shoppingList') && !salesLoaded) {
      const loadSales = async () => {
        const { data: salesRes } = await supabase
          .from('sales')
          .select('id, date, items, total, payment_method, user_id, created_at')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
        if (salesRes) {
          setSales(salesRes.map((s: any) => ({
            id: s.id,
            date: s.date,
            items: s.items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productBrand: item.productBrand || '',
              productModel: item.productModel || '',
              quantity: item.quantity,
              price: item.price,
              total: item.total
            })),
            total: s.total,
            paymentMethod: s.payment_method,
            userId: s.user_id,
            createdAt: s.created_at
          })));
        }
        setSalesLoaded(true);
      };
      loadSales();
    }
  }, [viewMode, salesLoaded]);



  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['Todas', ...Array.from(cats) as string[]];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (p.barcode || '').includes(searchQuery) ||
                           (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= (p.minStock || 0) && p.stock > 0);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 0);
  }, [products]);

  const mostSoldData = useMemo(() => {
    const periodDays = parseInt(reportPeriod);
    const startDate = subDays(new Date(), periodDays);
    
    const productSales: Record<string, { name: string, brand: string, model: string, quantity: number, total: number }> = {};
    
    sales.forEach(sale => {
      if (parseISO(sale.date) >= startDate) {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { 
              name: item.productName, 
              brand: item.productBrand || '', 
              model: item.productModel || '', 
              quantity: 0, 
              total: 0 
            };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].total += item.total;
        });
      }
    });

    return Object.values(productSales).sort((a, b) => b.quantity - a.quantity);
  }, [sales, reportPeriod]);

  const shoppingListData = useMemo(() => {
    const periodDays = 30; // Use last 30 days for suggestion
    const startDate = subDays(new Date(), periodDays);
    
    const productSales: Record<string, number> = {};
    sales.forEach(sale => {
      if (parseISO(sale.date) >= startDate) {
        sale.items.forEach(item => {
          productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        });
      }
    });

    return products.map(p => {
      const sold = productSales[p.id] || 0;
      const suggestion = Math.max(0, sold - p.stock);
      return {
        ...p,
        sold,
        suggestion
      };
    }).filter(p => p.suggestion > 0 || p.stock <= p.minStock);
  }, [products, sales]);

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || profile?.user_id || profile?.id;

      if (!userId) {
        onShowToast('Falha na identificação do administrador. Faça login novamente.');
        return;
      }

      const dbData = {
        name: productData.name,
        company_id: profile.company_id,
        brand: productData.brand,
        model: productData.model,
        category: productData.category,
        description: productData.description,
        barcode: productData.barcode,
        price: productData.price,
        cost_price: productData.costPrice,
        stock: productData.stock,
        min_stock: productData.minStock,
        image: productData.image,
        updated_at: new Date().toISOString()
      };

      if (editingProduct) {
        const oldStock = editingProduct.stock;
        const newStock = productData.stock || 0;
        
        const { error } = await supabase
          .from('products')
          .update(dbData)
          .eq('id', editingProduct.id)
          .eq('company_id', profile.company_id);

        if (error) throw new Error(error.message || JSON.stringify(error));

        if (oldStock !== newStock) {
          // Notificar se o estoque zerou ou atingiu o mínimo após edição
          if (newStock <= 0) {
            onShowToast(`⚠️ ALERTA: O produto ${productData.name} está ESGOTADO!`);
          } else if (newStock <= (productData.minStock || 0)) {
            onShowToast(`📢 AVISO: O produto ${productData.name} está com estoque baixo (${newStock} un).`);
          }

          await supabase.from('product_history').insert({
            product_id: editingProduct.id,
            company_id: profile.company_id,
            type: newStock > oldStock ? 'entrada' : 'saida',
            quantity: Math.abs(newStock - oldStock),
            reason: 'ajuste',
            date: new Date().toISOString().split('T')[0],
            user_id: userId,
            created_at: new Date().toISOString()
          });
        }

        onLogActivity?.('PRODUTOS', 'EDITOU PRODUTO', {
          productId: editingProduct.id,
          productName: productData.name,
          oldStock,
          newStock,
          price: productData.price,
          description: `Editou o produto ${productData.name} (Estoque: ${oldStock} -> ${newStock})`
        });
        // Optimistic update for edit
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
          ...p,
          name: productData.name || p.name,
          brand: productData.brand || '',
          model: productData.model || '',
          category: productData.category || p.category,
          description: productData.description || '',
          barcode: productData.barcode || p.barcode,
          price: productData.price || 0,
          costPrice: productData.costPrice || 0,
          stock: productData.stock ?? p.stock,
          minStock: productData.minStock ?? p.minStock,
          image: productData.image || p.image,
          updatedAt: new Date().toISOString()
        } : p));
        onShowToast('Produto atualizado com sucesso');
      } else {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert({
            ...dbData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw new Error(error.message || JSON.stringify(error));

        if (inserted) {
          await supabase.from('product_history').insert({
            product_id: inserted.id,
            company_id: profile.company_id,
            type: 'entrada',
            quantity: productData.stock,
            reason: 'inicial',
            date: new Date().toISOString().split('T')[0],
            user_id: userId,
            created_at: new Date().toISOString()
          });

          onLogActivity?.('PRODUTOS', 'CRIOU PRODUTO', {
            productId: inserted.id,
            productName: inserted.name,
            stock: inserted.stock,
            price: inserted.price,
            description: `Cadastrou o novo produto ${inserted.name} com ${inserted.stock} em estoque`
          });

          // Optimistic update for new product
          setProducts(prev => [
            ...prev,
            {
              id: inserted.id,
              name: inserted.name,
              brand: inserted.brand || '',
              model: inserted.model || '',
              image: inserted.image,
              category: inserted.category,
              description: inserted.description,
              barcode: inserted.barcode,
              price: inserted.price,
              costPrice: inserted.cost_price,
              stock: inserted.stock,
              minStock: inserted.min_stock,
              createdAt: inserted.created_at,
              updatedAt: inserted.updated_at
            }
          ].sort((a, b) => a.name.localeCompare(b.name)));
        }
        onShowToast('Produto cadastrado com sucesso');
      }

      // Switch to catalog view to show updated product
      setViewMode('catalog');
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error('Error saving product:', error);
      const errorMessage = error.message || error.details || error.hint || JSON.stringify(error);
      onShowToast('Erro ao salvar produto: ' + errorMessage);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .eq('company_id', profile.company_id);
          if (error) throw error;
          
          onLogActivity?.('PRODUTOS', 'EXCLUIU PRODUTO', {
            productId: id,
            description: `Excluiu permanentemente um produto do catálogo (ID: ${id})`
          });
          
          onShowToast('Produto excluído');
        } catch (error: any) {
          console.error('Error deleting product:', error);
          onShowToast('Erro ao excluir: ' + error.message);
        }
        setConfirmModal(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-12 h-12 border-4 border-[#00E676] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,230,118,0.2)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <header className="bg-black/60 backdrop-blur-xl border-b border-zinc-900 p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Package className="text-[#00E676]" size={20} />
                Catálogo de Produtos
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Gestão de Estoque e Inteligência</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
              <div className="flex bg-black/40 p-1 rounded-xl border border-zinc-900 border-white/5 shadow-inner overflow-x-auto max-w-full no-scrollbar">
                <button 
                  onClick={() => setViewMode('catalog')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'catalog' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Grid size={13} />
                  Catálogo
                </button>
              {canViewReports && (
                <>
                  <button 
                    onClick={() => setViewMode('reports')}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'reports' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <TrendingUp size={13} />
                    Relatórios
                  </button>
                  <button 
                    onClick={() => setViewMode('shoppingList')}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${viewMode === 'shoppingList' ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ShoppingCart size={13} />
                    Reposição
                  </button>
                </>
              )}
            </div>
            {canEdit && (
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="relative bg-gradient-to-br from-[#00E676] to-[#00C853] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center gap-2 shadow-2xl shadow-[#00E676]/20 active:scale-95 group overflow-hidden shrink-0"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="relative z-10">Novo Produto</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8 overflow-y-auto custom-scrollbar">
        {viewMode === 'catalog' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Filters & Search - Glassmorphism */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00E676] transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome, categoria ou código..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-[#00E676]/50 transition-all placeholder:text-zinc-600 text-sm font-medium focus:bg-zinc-900/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                      selectedCategory === cat 
                      ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676] shadow-xl' 
                      : 'bg-black/20 border-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center justify-between group hover:border-[#00E676]/20 transition-all">
                <div className="space-y-0.5">
                  <p className="text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Ativos</p>
                  <p className="text-lg sm:text-xl font-black text-white">{products.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#00E676]/10 flex items-center justify-center text-[#00E676]">
                  <Package size={16} className="sm:w-18 sm:h-18" />
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center justify-between group hover:border-amber-500/20 transition-all">
                <div className="space-y-0.5">
                  <p className="text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Alerta</p>
                  <p className="text-lg sm:text-xl font-black text-amber-500">{lowStockProducts.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <AlertTriangle size={16} className="sm:w-18 sm:h-18" />
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center justify-between group hover:border-red-500/20 transition-all col-span-2 md:col-span-1">
                <div className="space-y-0.5">
                  <p className="text-[8px] sm:text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Zerados</p>
                  <p className="text-lg sm:text-xl font-black text-red-500">{outOfStockProducts.length}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Package size={16} className="sm:w-18 sm:h-18" />
                </div>
              </div>
            </div>

            {/* Product Grid - Smaller Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onEdit={() => {
                    setEditingProduct(product);
                    setIsProductModalOpen(true);
                  }}
                  onDelete={() => handleDeleteProduct(product.id)}
                  canEdit={canEdit}
                />
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-zinc-700">
                    <Package size={40} />
                  </div>
                  <p className="text-zinc-500">Nenhum produto encontrado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <TrendingUp className="text-[#00E676]" />
                Produtos Mais Vendidos
              </h2>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                {[
                  { label: 'Hoje', value: '0' },
                  { label: '7 dias', value: '7' },
                  { label: '15 dias', value: '15' },
                  { label: '30 dias', value: '30' }
                ].map(p => (
                  <button
                    key={p.value}
                    onClick={() => setReportPeriod(p.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportPeriod === p.value ? 'bg-[#00E676] text-black shadow-lg shadow-[#00E676]/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2.5rem] shadow-xl">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Gráfico de Vendas (Quantidade)</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostSoldData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141414', border: '1px solid #333', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="quantity" fill="#00E676" radius={[4, 4, 0, 0]}>
                        {mostSoldData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#00E676' : '#00E676' + (index < 3 ? '88' : '44')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-xl overflow-x-auto no-scrollbar">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="bg-black/40 text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                      <th className="px-6 py-4">Produto</th>
                      <th className="px-6 py-4 text-center">Qtd Vendida</th>
                      <th className="px-6 py-4 text-right">Total Faturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {mostSoldData.map((item, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-white leading-tight">{item.name}</p>
                          {(item.brand || item.model) && (
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                              {item.brand} {item.model}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-[#00E676]/10 text-[#00E676] px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs font-black text-[#00E676]">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {mostSoldData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-24 text-center text-zinc-500 text-xs font-medium italic">
                          Nenhuma venda registrada no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'shoppingList' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <ShoppingCart className="text-[#00E676]" />
                  Lista de Compras Inteligente
                </h2>
                <p className="text-xs text-zinc-500 font-medium">Sugestões de reposição baseadas na saúde do seu estoque.</p>
              </div>
              <button className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/5 active:scale-95">
                <Download size={16} />
                Exportar CSV
              </button>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-black/40 text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4 text-center">Vendido (30d)</th>
                    <th className="px-6 py-4 text-center">Estoque Atual</th>
                    <th className="px-6 py-4 text-center">Min. Sugerido</th>
                    <th className="px-6 py-4 text-right">Sugestão Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {shoppingListData.map((item, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {item.image ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-white/5">
                              <Image 
                                src={item.image} 
                                alt={item.name} 
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-700">
                              <Package size={20} />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                            {(item.brand || item.model) && (
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                {item.brand} {item.model}
                              </p>
                            )}
                            <p className="text-[10px] text-zinc-600 uppercase font-bold mt-0.5">{item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-sm font-medium text-zinc-300">{item.sold}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${item.stock <= item.minStock ? 'text-red-500' : 'text-zinc-300'}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-sm text-zinc-500">{item.minStock}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-black">
                            + {item.suggestion || Math.max(1, (item.minStock - item.stock + 5))}
                          </span>
                          <ArrowUpRight size={14} className="text-blue-500" />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shoppingListData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-zinc-500">
                        Seu estoque está saudável! Nenhuma sugestão de compra no momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <ProductModal 
            product={editingProduct}
            onClose={() => setIsProductModalOpen(false)}
            onSave={handleSaveProduct}
            onShowToast={onShowToast}
            categories={categories.filter(c => c !== 'Todas')}
          />
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
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete, canEdit }: { product: Product, onEdit: () => void, onDelete: () => void, canEdit: boolean }) {
  const isLowStock = product.stock <= product.minStock && product.stock > 0;
  const isOutOfStock = product.stock <= 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden flex flex-col group hover:border-[#00E676]/30 transition-all hover:shadow-2xl hover:shadow-[#00E676]/5 relative"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-zinc-950">
        {product.image ? (
          <Image 
            src={product.image} 
            alt={product.name} 
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-800">
            <Package size={40} />
          </div>
        )}
        
        {/* Badges - More subtle */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="bg-black/60 backdrop-blur-md text-[8px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest text-[#00E676] border border-[#00E676]/20">
            {product.category}
          </span>
        </div>

        {/* Action Overlay */}
        {canEdit && (
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={onEdit}
              className="p-1.5 bg-black/60 backdrop-blur-xl hover:bg-[#00E676] hover:text-black text-white rounded-lg border border-white/5 transition-all shadow-xl"
            >
              <Edit2 size={12} />
            </button>
            <button 
              onClick={onDelete}
              className="p-1.5 bg-black/60 backdrop-blur-xl hover:bg-red-500 text-white rounded-lg border border-white/5 transition-all shadow-xl"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="p-2 sm:p-3.5 space-y-2 sm:space-y-3">
        <div className="space-y-0.5">
          <h3 className="font-bold text-[11px] sm:text-xs text-zinc-100 truncate group-hover:text-[#00E676] transition-colors">{product.name}</h3>
          <p className="text-[9px] sm:text-[10px] text-zinc-500 font-medium truncate">{product.description || 'Sem descrição'}</p>
        </div>

        <div className="flex items-center justify-between pt-0.5 sm:pt-1">
          <div className="space-y-0.5">
            <p className="text-[7px] sm:text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Preço</p>
            <p className="text-xs sm:text-sm font-black text-[#00E676]">R$ {Number(product.price || 0).toFixed(2)}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[7px] sm:text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Estoque</p>
            <div className="flex items-center justify-end gap-1 sm:gap-1.5">
               <span className={`text-[10px] sm:text-xs font-black ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-zinc-300'}`}>
                 {product.stock}
               </span>
               <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isOutOfStock ? 'bg-red-500 animate-pulse' : isLowStock ? 'bg-amber-500' : 'bg-[#00E676]'}`}></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProductModal({ product, onClose, onSave, onShowToast, categories }: { product: Product | null, onClose: () => void, onSave: (p: Partial<Product>) => void, onShowToast: (m: string) => void, categories: string[] }) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product ? { ...product } : {
      name: '',
      brand: '',
      model: '',
      category: categories[0] || 'Geral',
      description: '',
      barcode: '',
      price: 0,
      costPrice: 0,
      stock: 0,
      minStock: 5,
      image: ''
    }
  );

  const [isSearching, setIsSearching] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isDuplicate || !formData.name || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };


  useEffect(() => {
    const checkDuplicate = async () => {
      if (formData.barcode && formData.barcode.length > 5) {
        try {
            const { data, error } = await supabase.from('products').select('id').eq('barcode', formData.barcode);
            if (error) throw error;
            const found = data && data.length > 0 && (!product || data.some(p => p.id !== product.id));
            setIsDuplicate(!!found);
        } catch (e) {
            console.error('Error checking duplicate barcode:', e);
            setIsDuplicate(false);
        }
      } else {
        setIsDuplicate(false);
      }
    };
    checkDuplicate();
  }, [formData.barcode, product]);

  const handleBarcodeSearch = async (codeToSearch?: string) => {
    const code = codeToSearch || formData.barcode;
    if (!code) {
      onShowToast('Digite ou escaneie um código para buscar');
      return;
    }

    setIsSearching(true);
    try {
      const resp = await fetch(`/api/produtos/buscar-por-codigo/${code}`);
      const data = await resp.json();

      if (data.status) {
        const newFields = new Set<string>();
        const updates: Partial<Product> = { barcode: code };

        if (data.nome && !formData.name) { updates.name = data.nome; newFields.add('name'); }
        if (data.categoria && !formData.category) { updates.category = data.categoria; newFields.add('category'); }
        if (data.image && !formData.image) { updates.image = data.image; newFields.add('image'); }
        if (data.marca) {
            updates.brand = data.marca;
            newFields.add('brand');
        }

        setFormData(prev => ({ ...prev, ...updates }));
        setAutoFilledFields(newFields);
        onShowToast('Dados do produto encontrados automaticamente!');
        
        // Limpar os destaques após 3 segundos
        setTimeout(() => setAutoFilledFields(new Set()), 3000);
      } else {
        onShowToast('Produto não encontrado. Você pode preencher os dados manualmente.');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      onShowToast('Falha ao consultar base externa');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };



  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0A0A0A] border border-white/10 sm:rounded-[32px] rounded-2xl w-full max-w-5xl sm:max-h-[85vh] max-h-[96vh] overflow-hidden flex flex-col shadow-2xl relative"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#00E676]/10 flex items-center justify-center text-[#00E676]">
                {product ? <Edit2 size={18} /> : <Plus size={18} />}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                {product ? 'Editar Produto' : 'Novo Produto'}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Identification & Data */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Secção: Identificação do Produto */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#00E676] rounded-full" />
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Entrada por Código</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Barcode className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isDuplicate ? 'text-red-500' : 'text-zinc-500'}`} size={20} />
                      <input 
                        type="text" 
                        value={formData.barcode}
                        onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                        className={`w-full bg-black/60 border ${isDuplicate ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-blue-500/50'} rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none transition-all font-black text-lg tracking-tight`}
                        placeholder="Código de Barras"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleBarcodeSearch();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => handleBarcodeSearch()}
                        disabled={isSearching}
                        className="flex-1 sm:flex-none px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {isSearching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={16} />}
                        {isSearching ? '...' : 'Buscar'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="flex-1 sm:flex-none px-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Camera size={18} />
                        Escanear
                      </button>
                    </div>
                  </div>
                  
                  {isDuplicate && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest px-4"
                    >
                        <AlertTriangle size={14} />
                        Este produto já existe no sistema
                    </motion.div>
                  )}
                  
                  {!isDuplicate && formData.barcode && !isSearching && (
                     <p className="text-[10px] text-zinc-600 font-medium px-4">
                        Dica: Pressione ENTER ou clique em Buscar. Você também pode usar seu leitor USB aqui.
                     </p>
                  )}
                </div>
              </div>

              {/* Secção: Dados do Produto */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#00E676] rounded-full" />
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Dados do Produto</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Nome do Produto</label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: capFirst(e.target.value) }))}
                        className={`w-full bg-zinc-900/50 border ${autoFilledFields.has('name') ? 'border-[#00E676]' : 'border-zinc-800'} rounded-2xl px-5 py-3 sm:py-3.5 text-white focus:outline-none focus:border-[#00E676]/50 transition-all font-bold placeholder:text-zinc-700`}
                        placeholder="Ex: Tela iPhone 13 Pro Max"
                      />
                      {autoFilledFields.has('name') && <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00E676] animate-bounce" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Marca</label>
                    <input 
                      type="text" 
                      value={formData.brand}
                      onChange={e => setFormData(prev => ({ ...prev, brand: capFirst(e.target.value) }))}
                      className={`w-full bg-zinc-900/50 border ${autoFilledFields.has('brand') ? 'border-[#00E676]' : 'border-zinc-800'} rounded-2xl px-5 py-3 sm:py-4 text-white focus:outline-none focus:border-[#00E676]/50 transition-all font-bold placeholder:text-zinc-700`}
                      placeholder="Ex: Apple, Samsung"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Modelo</label>
                    <input 
                      type="text" 
                      value={formData.model}
                      onChange={e => setFormData(prev => ({ ...prev, model: capFirst(e.target.value) }))}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-3 sm:py-4 text-white focus:outline-none focus:border-[#00E676]/50 transition-all font-bold placeholder:text-zinc-700"
                      placeholder="Ex: A2643, SM-G998B"
                    />
                  </div>

                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Categoria</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        list="categories-list"
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: capFirst(e.target.value) }))}
                        className={`w-full bg-zinc-900/50 border ${autoFilledFields.has('category') ? 'border-[#00E676]' : 'border-zinc-800'} rounded-2xl px-5 py-3 sm:py-4 text-white focus:outline-none focus:border-[#00E676]/50 transition-all font-bold placeholder:text-zinc-700`}
                        placeholder="Selecione ou digite uma categoria"
                      />
                      <datalist id="categories-list">
                        {categories.map(c => <option key={c} value={c} />)}
                      </datalist>
                      {autoFilledFields.has('category') && <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00E676] animate-bounce" />}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Descrição</label>
                  <div className="relative">
                    <textarea 
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: capFirst(e.target.value) }))}
                        className={`w-full bg-zinc-900/50 border ${autoFilledFields.has('description') ? 'border-[#00E676]' : 'border-zinc-800'} rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-[#00E676]/50 transition-all min-h-[60px] font-medium resize-none placeholder:text-zinc-700`}
                        placeholder="Observações adicionais, compatibilidade, etc..."
                    />
                    {autoFilledFields.has('description') && <CheckCircle2 size={16} className="absolute right-4 top-4 text-[#00E676] animate-bounce" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Preço Venda</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.price || ''}
                      onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-[#00E676] font-black text-xl focus:outline-none focus:border-[#00E676]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Custo</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.costPrice || ''}
                      onChange={e => setFormData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-400 font-bold focus:outline-none focus:border-white/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Estoque</label>
                    <input 
                      type="number" 
                      value={formData.stock || ''}
                      onChange={e => setFormData(prev => ({ ...prev, stock: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-black text-xl focus:outline-none focus:border-white/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                      Min. Alerta
                      <InfoTooltip position="top" content="Quando o estoque chegar neste número, o sistema alertará que está na hora de repor." className="ml-0.5" />
                    </label>
                    <input 
                      type="number" 
                      value={formData.minStock || ''}
                      onChange={e => setFormData(prev => ({ ...prev, minStock: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-amber-500 font-black text-xl focus:outline-none focus:border-amber-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Image Preview */}
            <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-3 bg-purple-500 rounded-full" />
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Mídia</h3>
                </div>

              <div className="lg:sticky lg:top-0 space-y-4">
                <div className={`aspect-[4/3] rounded-[24px] border-2 border-dashed ${autoFilledFields.has('image') ? 'border-[#00E676]' : 'border-zinc-800'} bg-black/40 overflow-hidden relative group hover:border-zinc-700 transition-all`}>
                  {formData.image ? (
                    <>
                      <Image src={formData.image} alt="Preview" fill className="object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 gap-3">
                        <label className="w-full py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95">
                          <Edit2 size={14} /> Trocar Imagem
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          className="w-full py-3 bg-red-500/20 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-colors group">
                      <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#00E676]/10 group-hover:text-[#00E676] transition-all">
                        <ImageIcon size={32} />
                      </div>
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Adicionar Foto</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
                
                <div className="p-4 bg-zinc-900/40 border border-[#00E676]/10 rounded-2xl flex items-start gap-3 shadow-inner">
                  <Info size={16} className="text-[#00E676] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-black uppercase tracking-widest">
                    Sugestão: Cadastre seus produtos com fotos reais para facilitar a identificação no PDV e melhorar a organização do catálogo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto ml-auto">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              Descartar
            </button>
            <button 
              onClick={handleSave}
              disabled={isDuplicate || !formData.name || isSaving}
              className={`flex-1 sm:flex-none px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl ${isDuplicate || !formData.name || isSaving ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-[#00E676] hover:bg-[#00C853] text-black shadow-[#00E676]/20'}`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {product ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scanner Overlay */}
        <AnimatePresence>
            {isScannerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full max-w-xl aspect-square bg-zinc-900 rounded-[32px] border border-white/10 overflow-hidden relative flex flex-col shadow-2xl"
                    >
                        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Escanear Código</h3>
                            <button onClick={() => setIsScannerOpen(false)} className="w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black rounded-full transition-colors text-white">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="flex-1 relative bg-black">
                            {/* Visual guide */}
                            <div className="absolute inset-0 pointer-events-none border-[60px] border-black/60 flex items-center justify-center z-10">
                                <div className="w-full h-full border-2 border-[#00E676] rounded-2xl relative">
                                    <div className="absolute left-[-2px] right-[-2px] top-1/2 h-[2px] bg-[#00E676] shadow-[0_0_10px_#00E676] animate-pulse" />
                                </div>
                            </div>
                            
                            {/* Real QR/Barcode Scanner Component (Dynamic Script Load) */}
                            <BarcodeScannerComponent 
                                onScan={(code) => {
                                    setFormData(prev => ({ ...prev, barcode: code }));
                                    setIsScannerOpen(false);
                                    handleBarcodeSearch(code);
                                }} 
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Sub-component for dynamic script loading of html5-qrcode
function BarcodeScannerComponent({ onScan }: { onScan: (code: string) => void }) {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let scanner: any = null;
        
        const loadScript = () => {
            if (document.getElementById('html5-qrcode-script')) {
                initScanner();
                return;
            }
            const script = document.createElement('script');
            script.id = 'html5-qrcode-script';
            script.src = 'https://unpkg.com/html5-qrcode';
            script.onload = initScanner;
            document.head.appendChild(script);
        };

        const initScanner = () => {
            // @ts-ignore
            if (typeof Html5QrcodeScanner === 'undefined') {
                setError("Falha ao carregar o scanner");
                return;
            }

            try {
                // @ts-ignore
                scanner = new Html5QrcodeScanner(
                    "reader", 
                    { 
                        fps: 10, 
                        qrbox: {width: 250, height: 250},
                        aspectRatio: 1.0,
                        showTorchButtonIfSupported: true,
                        showZoomSliderIfSupported: true,
                        defaultZoomValueIfSupported: 2
                    },
                    /* verbose= */ false
                );
                
                scanner.render((decodedText: string) => {
                    onScan(decodedText);
                    scanner.clear();
                }, (err: any) => {
                    // Ignore silent errors
                });
            } catch (e) {
                console.error(e);
                setError("Erro ao inicializar câmera");
            }
        };

        loadScript();

        return () => {
            if (scanner) {
                try {
                    scanner.clear();
                } catch (e) {}
            }
        };
    }, []);

    return (
        <div id="reader-container" className="w-full h-full flex items-center justify-center bg-zinc-900 absolute inset-0">
            <div id="reader" className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
            {error && <div className="absolute z-50 p-4 bg-red-500/90 text-white rounded-xl text-sm font-bold shadow-xl">{error}</div>}
            <style jsx global>{`
                /* Override html5-qrcode default styling to make it look clean */
                #reader { border: none !important; }
                #reader__scan_region { background: transparent !important; }
                #reader__dashboard { background: transparent !important; padding: 1rem !important; position: absolute; bottom: 0; left:0; right:0; z-index: 20; display:flex; flex-direction: column; align-items: center;}
                #reader__dashboard_section_csr span { color: white !important; font-family: sans-serif; font-size: 12px; font-weight: bold; }
                #reader__dashboard_section_csr button { background: rgba(255,255,255,0.1) !important; color: white !important; border: 1px solid rgba(255,255,255,0.2) !important; padding: 8px 16px !important; border-radius: 999px !important; transition: all 0.2s; cursor: pointer; font-size: 12px; font-weight: bold; margin: 4px; }
                #reader__dashboard_section_csr button:hover { background: rgba(255,255,255,0.2) !important; }
                #reader__dashboard_section_swaplink { color: #3b82f6 !important; text-decoration: none !important; font-weight: bold; margin-top: 10px; display: inline-block;}
                #reader__camera_selection { background: #141414; color: white; border: 1px solid rgba(255,255,255,0.1); padding: 8px; rounded: 8px; margin-bottom: 8px; outline: none; border-radius: 8px; max-width: 200px; font-size: 12px;}
            `}</style>
        </div>
    );
}
