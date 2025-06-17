import React, { useEffect, useState, useCallback } from 'react';
import { PageTitle, Card, Modal, Spinner } from '../components/SharedComponents';
import { PricingListItem, PricingHistoryEntry, PricingCategory } from '../types';
import {
  getPricingProducts,
  savePricingProduct,
  getPricingHistory,
  getProductCategories,
  saveProductCategory,
} from '../services/AppService';
import { Clock } from 'lucide-react';

const ProductPricingDashboardPage: React.FC = () => {
  const [items, setItems] = useState<PricingListItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [draftCost, setDraftCost] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PricingListItem[][]>([]);
  const [redoStack, setRedoStack] = useState<PricingListItem[][]>([]);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [historyEntries, setHistoryEntries] = useState<PricingHistoryEntry[]>([]);
  const [categories, setCategories] = useState<PricingCategory[]>([]);
  const [highlightProductId, setHighlightProductId] = useState<number | null>(null);
  const [highlightCategoryId, setHighlightCategoryId] = useState<string | null>(null);

  useEffect(() => {
    getPricingProducts()
      .then(setItems)
      .catch(err => console.error('Failed to load products', err));
    getProductCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  const loadHistory = useCallback((id: number) => {
    getPricingHistory(String(id))
      .then(setHistoryEntries)
      .catch(() => setHistoryEntries([]));
  }, []);

  const savePrice = async (id: number, valor: number) => {
    const existing = items.find(i => i.productId === id);
    if (!existing) return;
    setUndoStack(prev => [...prev, items]);
    setRedoStack([]);
    setSavingId(id);
    try {
      await savePricingProduct({ id: String(id), valorTabela: valor } as any);
      setItems(prev => prev.map(it => it.productId === id ? { ...it, valorTabela: valor, updatedAt: new Date().toISOString() } : it));
      setHighlightProductId(id);
      setTimeout(() => setHighlightProductId(h => (h === id ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to save price', err);
    }
    setSavingId(null);
  };

  const saveCost = async (id: number, valor: number) => {
    const existing = items.find(i => i.productId === id);
    if (!existing) return;
    setUndoStack(prev => [...prev, items]);
    setRedoStack([]);
    setSavingId(id);
    try {
      await savePricingProduct({ id: String(id), custoBRL: valor } as any);
      setItems(prev => prev.map(it => it.productId === id ? { ...it, custoBRL: valor, updatedAt: new Date().toISOString() } : it));
      setHighlightProductId(id);
      setTimeout(() => setHighlightProductId(h => (h === id ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to save cost', err);
    }
    setSavingId(null);
  };

  const saveCategory = async (cat: PricingCategory) => {
    setSavingCategoryId(cat.id);
    try {
      await saveProductCategory(cat);
      setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
      setHighlightCategoryId(cat.id);
      setTimeout(() => setHighlightCategoryId(h => (h === cat.id ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to save category', err);
    }
    setSavingCategoryId(null);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(u => u.slice(0, u.length - 1));
    setRedoStack(r => [...r, items]);
    setItems(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, r.length - 1));
    setUndoStack(u => [...u, items]);
    setItems(next);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoStack, redoStack, items]);

  const groupedItems = items.reduce<Record<string, PricingListItem[]>>((acc, it) => {
    acc[it.categoryName] = acc[it.categoryName] || [];
    acc[it.categoryName].push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <PageTitle title="Precificação de Produtos" />
      <Card title="Produtos" bodyClassName="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Produto</th>
                <th className="px-2 py-1 text-right">Custo BRL</th>
                <th className="px-2 py-1 text-right">Valor de Tabela</th>
                <th className="px-2 py-1 text-right">Atualizado Em</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedItems).map(([cat, list]) => (
                <React.Fragment key={cat}>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-2 py-1 font-semibold">{cat}</td>
                  </tr>
                  {list.map(it => (
                    <tr key={it.productId} className={highlightProductId === it.productId ? 'bg-green-50' : ''}>
                      <td className="px-2 py-1">{it.productName}</td>
                      <td className="px-2 py-1 text-right">
                        {editingCostId === it.productId ? (
                          <input
                            className="w-24 border px-1 text-right"
                            value={draftCost}
                            autoFocus
                            onChange={e => setDraftCost(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(draftCost.replace(',', '.'));
                              if (!isNaN(val)) saveCost(it.productId, val);
                              setEditingCostId(null);
                            }}
                          />
                        ) : (
                          <span onClick={() => { setEditingCostId(it.productId); setDraftCost(it.custoBRL?.toFixed(2) || ''); }} className="cursor-pointer">
                            {it.custoBRL?.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {editingId === it.productId ? (
                          <input
                            className="w-24 border px-1 text-right"
                            value={draftValue}
                            autoFocus
                            onChange={e => setDraftValue(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(draftValue.replace(',', '.'));
                              if (!isNaN(val)) savePrice(it.productId, val);
                              setEditingId(null);
                            }}
                          />
                        ) : (
                          <span onClick={() => { setEditingId(it.productId); setDraftValue(it.valorTabela?.toFixed(2) || ''); }} className="cursor-pointer">
                            {it.valorTabela?.toFixed(2)}
                          </span>
                        )}
                        {savingId === it.productId && <Spinner size="sm" className="ml-1 inline" />}
                        {savingId !== it.productId && editingId !== it.productId && editingCostId !== it.productId && (
                          <Clock className="inline ml-1 w-3 h-3 text-gray-500 cursor-pointer" onClick={() => { setHistoryFor(it.productId); loadHistory(it.productId); }} />
                        )}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('pt-BR') : ''}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Categorias" bodyClassName="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Dust Bag</th>
                <th className="px-2 py-1 text-right">Packaging</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className={highlightCategoryId === cat.id ? 'bg-green-50' : ''}>
                  <td className="px-2 py-1">{cat.name}</td>
                  <td className="px-2 py-1 text-right">
                    <input
                      className="w-20 border px-1 text-right"
                      value={cat.dustBag}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, dustBag: isNaN(val) ? 0 : val } : c));
                      }}
                      onBlur={() => {
                        const current = categories.find(c => c.id === cat.id);
                        if (current) saveCategory(current);
                      }}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      className="w-20 border px-1 text-right"
                      value={cat.packaging}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, packaging: isNaN(val) ? 0 : val } : c));
                      }}
                      onBlur={() => {
                        const current = categories.find(c => c.id === cat.id);
                        if (current) saveCategory(current);
                      }}
                    />
                    {savingCategoryId === cat.id && <Spinner size="sm" className="ml-1 inline" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal isOpen={historyFor !== null} onClose={() => setHistoryFor(null)} title="Histórico de Preço" size="sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-2 py-1">Data</th>
              <th className="text-right px-2 py-1">Valor</th>
            </tr>
          </thead>
          <tbody>
            {historyEntries.map(h => (
              <tr key={h.id}>
                <td className="px-2 py-1">{new Date(h.recordedAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-2 py-1 text-right">{h.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
};

export default ProductPricingDashboardPage;
