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
  const [editingProfitId, setEditingProfitId] = useState<number | null>(null);
  const [draftProfit, setDraftProfit] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PricingListItem[][]>([]);
  const [redoStack, setRedoStack] = useState<PricingListItem[][]>([]);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [historyEntries, setHistoryEntries] = useState<PricingHistoryEntry[]>([]);
  const [categories, setCategories] = useState<PricingCategory[]>([]);
  const [highlightProductId, setHighlightProductId] = useState<number | null>(null);
  const [highlightCategoryId, setHighlightCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getPricingProducts()
      .then(setItems)
      .catch(err => console.error('Failed to load products', err));
    getProductCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  useEffect(() => {
    const names = Array.from(new Set(items.map(i => i.categoryName)));
    setExpandedCategories(prev => {
      const next = { ...prev };
      names.forEach(n => {
        if (next[n] === undefined) next[n] = true;
      });
      return next;
    });
  }, [items]);

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
      const margin = existing.lucroPercent ?? categories.find(c => c.name === existing.categoryName)?.lucroPercent ?? 0;
      const price = valor * (1 + margin / 100);
      await savePricingProduct({ id: String(id), custoBRL: valor, valorTabela: price } as any);
      setItems(prev => prev.map(it => it.productId === id ? { ...it, custoBRL: valor, valorTabela: price, updatedAt: new Date().toISOString() } : it));
      setHighlightProductId(id);
      setTimeout(() => setHighlightProductId(h => (h === id ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to save cost', err);
    }
    setSavingId(null);
  };

  const saveProfit = async (id: number, percent: number) => {
    const existing = items.find(i => i.productId === id);
    if (!existing) return;
    setUndoStack(prev => [...prev, items]);
    setRedoStack([]);
    setSavingId(id);
    try {
      const price = (existing.custoBRL ?? 0) * (1 + percent / 100);
      await savePricingProduct({ id: String(id), lucroPercent: percent, valorTabela: price } as any);
      setItems(prev => prev.map(it => it.productId === id ? { ...it, lucroPercent: percent, valorTabela: price, updatedAt: new Date().toISOString() } : it));
      setHighlightProductId(id);
      setTimeout(() => setHighlightProductId(h => (h === id ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to save profit', err);
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

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => ({ ...prev, [name]: !prev[name] }));
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
    <div className="space-y-6">
      <PageTitle title="Precificação de Produtos" />
      <Card title="Produtos" bodyClassName="p-4 space-y-4">
        <div className="hidden md:grid grid-cols-5 gap-4 font-semibold bg-gray-50 p-2 rounded">
          <div>Produto</div>
          <div className="text-right">Custo BRL</div>
          <div className="text-right">Lucro %</div>
          <div className="text-right">Valor de Tabela</div>
          <div className="text-right">Atualizado Em</div>
        </div>
        {Object.entries(groupedItems).map(([cat, list]) => (
          <div key={cat} className="mb-2">
            <button
              type="button"
              className="w-full flex justify-between items-center bg-gray-100 px-2 py-2 rounded"
              onClick={() => toggleCategory(cat)}
            >
              <span className="font-semibold">{cat}</span>
              <i className={`heroicons-outline-chevron-${expandedCategories[cat] ? 'up' : 'down'} h-4 w-4`} />
            </button>
            {expandedCategories[cat] && (
              <div className="space-y-2 mt-2">
                {list.map(it => (
                  <div
                    key={it.productId}
                    className={`grid grid-cols-5 gap-4 items-center px-2 py-2 rounded border ${highlightProductId === it.productId ? 'bg-green-50' : 'bg-white'}`}
                  >
                    <div>{it.productName}</div>
                    <div className="text-right">
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
                    </div>
                    <div className="text-right">
                      {editingProfitId === it.productId ? (
                        <input
                          className="w-16 border px-1 text-right"
                          value={draftProfit}
                          autoFocus
                          onChange={e => setDraftProfit(e.target.value)}
                          onBlur={() => {
                            const val = parseFloat(draftProfit.replace(',', '.'));
                            if (!isNaN(val)) saveProfit(it.productId, val);
                            setEditingProfitId(null);
                          }}
                        />
                      ) : (
                        <span onClick={() => { setEditingProfitId(it.productId); setDraftProfit((it.lucroPercent ?? categories.find(c => c.name === it.categoryName)?.lucroPercent ?? 0).toString()); }} className="cursor-pointer">
                          {(it.lucroPercent ?? categories.find(c => c.name === it.categoryName)?.lucroPercent ?? 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
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
                    </div>
                    <div className="text-right">
                      {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('pt-BR') : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>
      <Card title="Categorias" bodyClassName="p-4 space-y-2">
        <div className="hidden md:grid grid-cols-4 gap-4 font-semibold bg-gray-50 p-2 rounded">
          <div>Categoria</div>
          <div className="text-right">Dust Bag</div>
          <div className="text-right">Packaging</div>
          <div className="text-right">Lucro %</div>
        </div>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className={`grid grid-cols-4 gap-4 items-center px-2 py-2 rounded border ${highlightCategoryId === cat.id ? 'bg-green-50' : 'bg-white'}`}>
              <div>{cat.name}</div>
              <div className="text-right">
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
              </div>
              <div className="text-right">
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
              </div>
              <div className="text-right">
                <input
                  className="w-20 border px-1 text-right"
                  value={cat.lucroPercent}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, lucroPercent: isNaN(val) ? 0 : val } : c));
                  }}
                  onBlur={() => {
                    const current = categories.find(c => c.id === cat.id);
                    if (current) saveCategory(current);
                  }}
                />
                {savingCategoryId === cat.id && <Spinner size="sm" className="ml-1 inline" />}
              </div>
            </div>
          ))}
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
