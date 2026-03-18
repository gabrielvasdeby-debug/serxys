'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  Package, Plus, Search, ArrowLeft, 
  AlertTriangle, TrendingUp, ShoppingCart, 
  Barcode, Image as ImageIcon, 
  Edit2, Trash2, Save, X,
  ArrowUpRight,
  Download, Grid
} from 'lucide-react';
import { db, auth } from '../firebase';
import { 
  collection, query, onSnapshot, addDoc, 
  updateDoc, deleteDoc, doc, 
  orderBy
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { subDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Product {
  id: string;
  name: string;
  image?: string;
  category: string;
  description: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  createdAt: string;
  updatedAt: string;
}

interface Sale {
  id: string;
  date: string;
  items: {
    productId: string;
    productName: string;
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
    [key: string]: unknown;
  };
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export default function ProdutosModule({ profile, onBack, onShowToast }: ProdutosModuleProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), orderBy('name')),
      (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'products')
    );

    const unsubSales = onSnapshot(
      query(collection(db, 'sales'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'sales')
    );

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['Todas', ...Array.from(cats)].filter(Boolean);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.barcode.includes(searchQuery) ||
                           p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock && p.stock > 0);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 0);
  }, [products]);

  const mostSoldData = useMemo(() => {
    const periodDays = parseInt(reportPeriod);
    const startDate = subDays(new Date(), periodDays);
    
    const productSales: Record<string, { name: string, quantity: number, total: number }> = {};
    
    sales.forEach(sale => {
      if (parseISO(sale.date) >= startDate) {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { name: item.productName, quantity: 0, total: 0 };
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
      if (editingProduct) {
        const oldStock = editingProduct.stock;
        const newStock = productData.stock || 0;
        
        await updateDoc(doc(db, 'products', editingProduct.id), {
          ...productData,
          updatedAt: new Date().toISOString()
        });

        if (oldStock !== newStock) {
          await addDoc(collection(db, 'productHistory'), {
            productId: editingProduct.id,
            type: newStock > oldStock ? 'entrada' : 'saida',
            quantity: Math.abs(newStock - oldStock),
            reason: 'ajuste',
            date: new Date().toISOString().split('T')[0],
            userId: auth.currentUser?.uid || profile.id,
            createdAt: new Date().toISOString()
          });
        }
        onShowToast('Produto atualizado com sucesso');
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await addDoc(collection(db, 'productHistory'), {
          productId: docRef.id,
          type: 'entrada',
          quantity: productData.stock,
          reason: 'inicial',
          date: new Date().toISOString().split('T')[0],
          userId: auth.currentUser?.uid || profile.id,
          createdAt: new Date().toISOString()
        });
        onShowToast('Produto cadastrado com sucesso');
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
          onShowToast('Produto excluído');
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'products');
        }
        setConfirmModal(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <header className="bg-[#141414] border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Package className="text-blue-500" />
                Catálogo de Produtos
              </h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Controle de Estoque e Vendas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-zinc-800">
              <button 
                onClick={() => setViewMode('catalog')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'catalog' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Grid size={14} />
                Catálogo
              </button>
              {canViewReports && (
                <>
                  <button 
                    onClick={() => setViewMode('reports')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'reports' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <TrendingUp size={14} />
                    Mais Vendidos
                  </button>
                  <button 
                    onClick={() => setViewMode('shoppingList')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'shoppingList' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ShoppingCart size={14} />
                    Lista de Compras
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
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Plus size={18} />
                Novo Produto
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 space-y-6 overflow-y-auto custom-scrollbar">
        {viewMode === 'catalog' && (
          <>
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome, categoria ou código de barras..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141414] border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                      selectedCategory === cat 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                      : 'bg-[#141414] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#141414] border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total de Itens</p>
                  <p className="text-xl font-bold">{products.length}</p>
                </div>
              </div>
              <div className="bg-[#141414] border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Estoque Baixo</p>
                  <p className="text-xl font-bold text-amber-500">{lowStockProducts.length}</p>
                </div>
              </div>
              <div className="bg-[#141414] border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <X size={20} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Sem Estoque</p>
                  <p className="text-xl font-bold text-red-500">{outOfStockProducts.length}</p>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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
          </>
        )}

        {viewMode === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <TrendingUp className="text-emerald-500" />
                Produtos Mais Vendidos
              </h2>
              <div className="flex bg-[#141414] p-1 rounded-xl border border-zinc-800">
                {[
                  { label: 'Hoje', value: '0' },
                  { label: '7 dias', value: '7' },
                  { label: '15 dias', value: '15' },
                  { label: '30 dias', value: '30' }
                ].map(p => (
                  <button
                    key={p.value}
                    onClick={() => setReportPeriod(p.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportPeriod === p.value ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#141414] border border-zinc-800 rounded-3xl p-6">
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
                      <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {mostSoldData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#141414] border border-zinc-800 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#0A0A0A] text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                      <th className="px-6 py-4">Produto</th>
                      <th className="px-6 py-4 text-center">Qtd Vendida</th>
                      <th className="px-6 py-4 text-right">Total Faturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {mostSoldData.map((item, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-white">{item.name}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-xs font-bold">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-emerald-500">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {mostSoldData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-20 text-center text-zinc-500">
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <ShoppingCart className="text-blue-500" />
                  Lista de Compras Inteligente
                </h2>
                <p className="text-sm text-zinc-500 mt-1">Sugestões baseadas nas vendas dos últimos 30 dias e estoque atual.</p>
              </div>
              <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                <Download size={18} />
                Exportar Lista
              </button>
            </div>

            <div className="bg-[#141414] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0A0A0A] text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4 text-center">Vendido (30d)</th>
                    <th className="px-6 py-4 text-center">Estoque Atual</th>
                    <th className="px-6 py-4 text-center">Estoque Mínimo</th>
                    <th className="px-6 py-4 text-right">Sugestão de Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {shoppingListData.map((item, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden relative">
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
                            <p className="text-sm font-bold text-white">{item.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">{item.category}</p>
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
                            + {item.suggestion || (item.minStock - item.stock + 1)}
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#141414] border border-zinc-800 rounded-3xl overflow-hidden flex flex-col group hover:border-zinc-700 transition-all hover:shadow-2xl hover:shadow-black/50"
    >
      <div className="aspect-square relative overflow-hidden bg-zinc-900">
        {product.image ? (
          <Image 
            src={product.image} 
            alt={product.name} 
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-800">
            <Package size={64} />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className="bg-black/60 backdrop-blur-md text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-widest text-zinc-300 border border-white/10">
            {product.category}
          </span>
          {isOutOfStock && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
              Sem Estoque
            </span>
          )}
          {isLowStock && (
            <span className="bg-amber-500 text-black text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
              Estoque Baixo
            </span>
          )}
        </div>

        {/* Actions Overlay */}
        {canEdit && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={onEdit}
              className="p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-xl border border-white/10 transition-all"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={onDelete}
              className="p-2 bg-red-500/20 backdrop-blur-md hover:bg-red-500 text-white rounded-xl border border-red-500/20 transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4 flex-1 flex flex-col">
        <div>
          <h3 className="font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{product.name}</h3>
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2 min-h-[2rem]">{product.description || 'Sem descrição'}</p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Preço</p>
            <p className="text-lg font-black text-emerald-500">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Estoque</p>
            <p className={`text-lg font-black ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-zinc-300'}`}>
              {product.stock}
            </p>
          </div>
        </div>

        {product.barcode && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
            <Barcode size={12} />
            {product.barcode}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProductModal({ product, onClose, onSave, categories }: { product: Product | null, onClose: () => void, onSave: (data: Partial<Product>) => void, categories: string[] }) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: '',
      category: '',
      description: '',
      barcode: '',
      price: 0,
      costPrice: 0,
      stock: 0,
      minStock: 5,
      image: ''
    }
  );

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

  const generateBarcode = () => {
    const code = Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
    setFormData(prev => ({ ...prev, barcode: code }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#141414] border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {product ? <Edit2 size={24} className="text-blue-500" /> : <Plus size={24} className="text-blue-500" />}
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Image Upload */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Foto do Produto</label>
              <div className="aspect-square rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-900/50 overflow-hidden relative group">
                {formData.image ? (
                  <>
                    <Image 
                      src={formData.image} 
                      alt="Preview" 
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <ImageIcon size={48} className="text-zinc-700 mb-2" />
                    <span className="text-xs text-zinc-500 font-bold">Clique para upload</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome do Produto *</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ex: Tela iPhone 11 Original"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Categoria</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      list="categories-list"
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Ex: Telas, Baterias..."
                    />
                    <datalist id="categories-list">
                      {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[100px]"
                  placeholder="Detalhes técnicos, compatibilidade..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Código de Barras</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                    <input 
                      type="text" 
                      value={formData.barcode}
                      onChange={e => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Digite ou gere um código"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={generateBarcode}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-xl text-xs font-bold transition-all"
                  >
                    Gerar Auto
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-zinc-800">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Preço de Venda (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.price || ''}
                onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Preço de Custo (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.costPrice || ''}
                onChange={e => setFormData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Estoque Atual</label>
              <input 
                type="number" 
                value={formData.stock || ''}
                onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Estoque Mínimo</label>
              <input 
                type="number" 
                value={formData.minStock || ''}
                onChange={e => setFormData(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <Save size={18} />
            Salvar Produto
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
