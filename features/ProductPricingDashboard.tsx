import React, { useEffect, useState, useCallback } from 'react';
import { PageTitle, Card, Modal, Spinner, Input } from '../components/SharedComponents';
import { PricingListItem, PricingHistoryEntry, PricingCategory, PricingGlobals } from '../types';
import {
  getPricingProducts,
  savePricingProduct,
  getPricingHistory,
  getProductCategories,
  saveProductCategory,
  getPricingGlobals,
  savePricingGlobals,
} from '../services/AppService';
import { Clock, Check, X, Undo2, Redo2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [globals, setGlobals] = useState<PricingGlobals>({ nfPercent: 0, nfProduto: 0, frete: 0, roundTo: 70 });
  const [savingGlobals, setSavingGlobals] = useState(false);
  const [highlightGlobals, setHighlightGlobals] = useState(false);
  const [highlightProductId, setHighlightProductId] = useState<number | null>(null);
  const [highlightCategoryId, setHighlightCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [historyTab, setHistoryTab] = useState<'table' | 'chart'>('table');

  useEffect(() => {
    getPricingProducts()
      .then(setItems)
      .catch(err => console.error('Failed to load products', err));
    getProductCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to load categories', err));
    getPricingGlobals()
      .then(setGlobals)
      .catch(err => console.error('Failed to load globals', err));
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

  const computePrice = (
    cost: number,
    profit: number,
    categoryName: string
  ): number => {
    const cat = categories.find(c => c.name === categoryName);
    const base =
      cost +
      (cat?.dustBag || 0) +
      (cat?.packaging || 0) +
      (globals.nfProduto || 0) +
      (globals.frete || 0);
    const withNf = base * (1 + (globals.nfPercent || 0));
    const raw = withNf * (1 + profit / 100);
    const r = globals.roundTo ?? 70;
    const lower = Math.floor(raw / 100) * 100 + r;
    const higher = Math.ceil(raw / 100) * 100 + r;
    const rounded = Math.abs(raw - lower) <= Math.abs(higher - raw) ? lower : higher;
    return Math.round(rounded);
  };

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
      const margin = existing.usarLucroDaCategoria
        ? categories.find(c => c.name === existing.categoryName)?.lucroPercent ?? 0
        : existing.lucroPercent ?? categories.find(c => c.name === existing.categoryName)?.lucroPercent ?? 0;
      const price = computePrice(valor, margin, existing.categoryName);
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
      const price = computePrice(existing.custoBRL ?? 0, percent, existing.categoryName);
      await savePricingProduct({ id: String(id), lucroPercent: percent, valorTabela: price, usarLucroDaCategoria: false } as any);
      setItems(prev => prev.map(it => it.productId === id ? { ...it, lucroPercent: percent, valorTabela: price, usarLucroDaCategoria: false, updatedAt: new Date().toISOString() } : it));
      setHighlightProductId(id);
      setTimeout(() => setHighlightProductId(h => (h === id ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to save profit', err);
    }
    setSavingId(null);
  };

  const toggleUseCategory = async (id: number, value: boolean) => {
    const existing = items.find(i => i.productId === id);
    if (!existing) return;
    setUndoStack(prev => [...prev, items]);
    setRedoStack([]);
    setSavingId(id);
    try {
      const profit = value
        ? categories.find(c => c.name === existing.categoryName)?.lucroPercent ?? 0
        : existing.lucroPercent ?? categories.find(c => c.name === existing.categoryName)?.lucroPercent ?? 0;
      const price = computePrice(existing.custoBRL ?? 0, profit, existing.categoryName);
      await savePricingProduct({ id: String(id), usarLucroDaCategoria: value, valorTabela: price, lucroPercent: profit } as any);
      setItems(prev =>
        prev.map(it =>
          it.productId === id
            ? { ...it, usarLucroDaCategoria: value, lucroPercent: profit, valorTabela: price }
            : it
        )
      );
    } catch (err) {
      console.error('Failed to toggle category profit usage', err);
    }
    setSavingId(null);
  };

  const saveCategory = async (cat: PricingCategory) => {
    setSavingCategoryId(cat.id);
    try {
      await saveProductCategory(cat);
      setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
      setItems(prev =>
        prev.map(it =>
          it.categoryName === cat.name && it.usarLucroDaCategoria
            ? {
                ...it,
                valorTabela: computePrice(
                  it.custoBRL ?? 0,
                  it.lucroPercent ?? cat.lucroPercent,
                  it.categoryName
                ),
              }
            : it
        )
      );
      setHighlightCategoryId(cat.id);
      setTimeout(() => setHighlightCategoryId(h => (h === cat.id ? null : h)), 1500);
    } catch (err) {
      console.error('Failed to save category', err);
    }
    setSavingCategoryId(null);
  };

  const saveGlobals = async (g: PricingGlobals) => {
    setSavingGlobals(true);
    try {
      await savePricingGlobals(g);
      setGlobals(g);
      setItems(prev =>
        prev.map(it =>
          ({
            ...it,
            valorTabela: computePrice(
              it.custoBRL ?? 0,
              it.usarLucroDaCategoria
                ? categories.find(c => c.name === it.categoryName)?.lucroPercent ?? 0
                : it.lucroPercent ?? categories.find(c => c.name === it.categoryName)?.lucroPercent ?? 0,
              it.categoryName
            ),
          })
        )
      );
      setHighlightGlobals(true);
      setTimeout(() => setHighlightGlobals(false), 1500);
    } catch (err) {
      console.error('Failed to save globals', err);
    }
    setSavingGlobals(false);
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

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIds = filteredItems.map(i => i.productId);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const applyCategoryProfitBulk = async () => {
    for (const id of selectedIds) {
      await toggleUseCategory(id, true);
    }
  };

  const editProfitBulk = async () => {
    const input = window.prompt('Novo lucro (%)');
    if (!input) return;
    const val = parseFloat(input.replace(',', '.'));
    if (isNaN(val)) return;
    for (const id of selectedIds) {
      await saveProfit(id, val);
    }
  };

  const editCostBulk = async () => {
    const input = window.prompt('Novo custo (BRL)');
    if (!input) return;
    const val = parseFloat(input.replace(',', '.'));
    if (isNaN(val)) return;
    for (const id of selectedIds) {
      await saveCost(id, val);
    }
  };

  const recalcBulk = async () => {
    for (const id of selectedIds) {
      const it = items.find(p => p.productId === id);
      if (!it) continue;
      const profit = it.usarLucroDaCategoria
        ? categories.find(c => c.name === it.categoryName)?.lucroPercent ?? 0
        : it.lucroPercent ?? 0;
      const price = computePrice(it.custoBRL ?? 0, profit, it.categoryName);
      await savePrice(id, price);
    }
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

  const filteredItems = categoryFilter === 'all'
    ? items
    : items.filter(i => i.categoryName === categoryFilter);
  const groupedItems = filteredItems.reduce<Record<string, PricingListItem[]>>((acc, it) => {
    acc[it.categoryName] = acc[it.categoryName] || [];
    acc[it.categoryName].push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageTitle
        title="Precificação de Produtos"
        actions={(
          <div className="flex space-x-2 items-center">
            <button
              type="button"
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Desfazer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Refazer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="p-1 rounded hover:bg-gray-100"
            >
              {selectedIds.length === filteredItems.length ? 'Desselecionar Tudo' : 'Selecionar Tudo'}
            </button>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border text-sm rounded-md p-1"
            >
              <option value="all">Todas Categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      />
      <Card title="Produtos" bodyClassName="p-4 space-y-4">
        <div className="hidden md:grid grid-cols-5 gap-6 font-semibold bg-gray-50 py-3 px-2 rounded-xl shadow-sm border border-gray-200">
          <div>Produto</div>
          <div className="text-right">Custo BRL</div>
          <div className="text-right">Lucro %</div>
          <div className="text-right">Valor de Tabela</div>
          <div className="text-right">Atualizado Em</div>
        </div>
        {Object.entries(groupedItems).map(([cat, list]) => (
          <div key={cat} className={`mb-2 ${expandedCategories[cat] ? 'shadow-md' : ''}`}> 
            <button
              type="button"
              className="w-full flex justify-between items-center bg-gray-100 px-2 py-2 rounded"
              onClick={() => toggleCategory(cat)}
            >
              <span className="font-semibold">{cat}</span>
              <i className={`heroicons-outline-chevron-${expandedCategories[cat] ? 'up' : 'down'} h-4 w-4`} />
            </button>
            {expandedCategories[cat] && (
              <div className="space-y-2 mt-2 divide-y divide-gray-200">
                {list.map(it => (
                  <div
                    key={it.productId}
                    className={`p-3 rounded-xl shadow-sm border flex flex-col md:grid md:grid-cols-6 gap-2 ${highlightProductId === it.productId ? 'bg-green-50' : 'bg-white'}`}
                  >
                    <div className="flex items-start space-x-2 md:col-span-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedIds.includes(it.productId)}
                        onChange={() => toggleSelect(it.productId)}
                      />
                      <span className="font-bold">{it.productName}</span>
                    </div>
                    <div className="text-right md:col-span-1">
                      {editingCostId === it.productId ? (
                        <div className="flex items-center space-x-1">
                          <input
                            className="w-24 border px-1 text-right"
                            value={draftCost}
                            autoFocus
                            onChange={e => setDraftCost(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseFloat(draftCost.replace(',', '.'));
                              if (!isNaN(val)) saveCost(it.productId, val);
                              setEditingCostId(null);
                            }}
                            className="text-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setEditingCostId(null)} className="text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span onClick={() => { setEditingCostId(it.productId); setDraftCost(it.custoBRL?.toFixed(2) || ''); }} className="cursor-pointer text-sm text-gray-500 underline">
                          {it.custoBRL?.toFixed(2) ?? '-'}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex items-center justify-end space-x-1 md:col-span-1">
                      <input
                        type="checkbox"
                        checked={it.usarLucroDaCategoria ?? true}
                        onChange={e => toggleUseCategory(it.productId, e.target.checked)}
                        title="Seguir categoria"
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      {editingProfitId === it.productId && !it.usarLucroDaCategoria ? (
                        <div className="flex items-center space-x-1">
                          <input
                            className="w-16 border px-1 text-right"
                            value={draftProfit}
                            autoFocus
                            onChange={e => setDraftProfit(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseFloat(draftProfit.replace(',', '.'));
                              if (!isNaN(val)) saveProfit(it.productId, val);
                              setEditingProfitId(null);
                            }}
                            className="text-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setEditingProfitId(null)} className="text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            if (!it.usarLucroDaCategoria) {
                              setEditingProfitId(it.productId);
                              setDraftProfit(
                                (
                                  it.lucroPercent ??
                                  categories.find(c => c.name === it.categoryName)?.lucroPercent ??
                                  0
                                ).toString()
                              );
                            }
                          }}
                          className={`text-sm ${it.usarLucroDaCategoria ? 'italic text-blue-600 cursor-default' : 'cursor-pointer text-gray-500 underline'}`}
                        >
                          {(
                            it.lucroPercent ??
                            categories.find(c => c.name === it.categoryName)?.lucroPercent ??
                            0
                          ).toFixed(2)}
                          {it.usarLucroDaCategoria && (
                            <span className="ml-1 px-1 text-xs bg-blue-100 text-blue-600 rounded">HERDADO</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="text-right md:col-span-1">
                      {editingId === it.productId ? (
                        <div className="flex items-center space-x-1">
                          <input
                            className="w-24 border px-1 text-right"
                            value={draftValue}
                            autoFocus
                            onChange={e => setDraftValue(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseFloat(draftValue.replace(',', '.'));
                              if (!isNaN(val)) savePrice(it.productId, val);
                              setEditingId(null);
                            }}
                            className="text-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span onClick={() => { setEditingId(it.productId); setDraftValue(it.valorTabela?.toFixed(2) || ''); }} className="cursor-pointer font-bold underline">
                          {it.valorTabela?.toFixed(2)}
                        </span>
                      )}
                      {savingId === it.productId && <Spinner size="sm" className="ml-1 inline" />}
                      {savingId !== it.productId && editingId !== it.productId && editingCostId !== it.productId && (
                        <Clock className="inline ml-1 w-3 h-3 text-gray-500 cursor-pointer" onClick={() => { setHistoryFor(it.productId); loadHistory(it.productId); }} />
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500 md:col-span-1">
                      {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('pt-BR') : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>
      <Card title="Configurações Globais" bodyClassName="p-4 space-y-2" className={highlightGlobals ? 'border-green-500' : ''}>
        <div className="grid grid-cols-4 gap-4">
          <Input
            id="nfPercent"
            label="NF %"
            type="number"
            step="0.01"
            value={globals.nfPercent}
            onChange={e => setGlobals({ ...globals, nfPercent: parseFloat(e.target.value) || 0 })}
            onBlur={() => saveGlobals(globals)}
          />
          <Input
            id="nfProduto"
            label="NF Produto"
            type="number"
            step="0.01"
            value={globals.nfProduto}
            onChange={e => setGlobals({ ...globals, nfProduto: parseFloat(e.target.value) || 0 })}
            onBlur={() => saveGlobals(globals)}
          />
          <Input
            id="frete"
            label="Frete"
            type="number"
            step="0.01"
            value={globals.frete}
            onChange={e => setGlobals({ ...globals, frete: parseFloat(e.target.value) || 0 })}
            onBlur={() => saveGlobals(globals)}
          />
          <Input
            id="roundTo"
            label="Arredondar p/"
            type="number"
            step="1"
            value={globals.roundTo}
            onChange={e => setGlobals({ ...globals, roundTo: parseFloat(e.target.value) || 0 })}
            onBlur={() => saveGlobals(globals)}
          />
        </div>
        {savingGlobals && <Spinner size="sm" className="mt-2" />}
      </Card>
      <Card title="Categorias" bodyClassName="p-4 space-y-2">
        <div className="hidden md:grid grid-cols-4 gap-6 font-semibold bg-gray-50 py-3 px-2 rounded-xl shadow-sm border border-gray-200">
          <div>Categoria</div>
          <div className="text-right">Dust Bag</div>
          <div className="text-right">Packaging</div>
          <div className="text-right">Lucro %</div>
        </div>
        <div className="space-y-2 divide-y divide-gray-200">
          {categories.map(cat => (
            <div key={cat.id} className={`grid grid-cols-4 gap-6 items-center px-2 py-3 rounded-xl shadow-sm border border-gray-200 ${highlightCategoryId === cat.id ? 'bg-green-50' : 'bg-white'}`}>
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
      <Modal isOpen={historyFor !== null} onClose={() => setHistoryFor(null)} title="Histórico de Preço" size="lg">
        <div className="mb-4 flex space-x-2">
          <button
            className={`px-2 py-1 rounded ${historyTab === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setHistoryTab('table')}
          >
            Tabela
          </button>
          <button
            className={`px-2 py-1 rounded ${historyTab === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setHistoryTab('chart')}
          >
            Gráfico
          </button>
        </div>
        {historyTab === 'table' ? (
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
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyEntries.map(h => ({ date: new Date(h.recordedAt).toLocaleDateString('pt-BR'), price: h.price }))}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Modal>
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md p-4 flex justify-between items-center">
          <span>{selectedIds.length} selecionado(s)</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={applyCategoryProfitBulk}>Aplicar lucro da categoria</button>
            <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={editProfitBulk}>Editar lucro</button>
            <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={editCostBulk}>Editar custo</button>
            <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={recalcBulk}>Recalcular</button>
            <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={clearSelection}>Limpar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPricingDashboardPage;
