import React, { useEffect, useState, useCallback } from 'react';
import { PageTitle, Card, Modal, Spinner } from '../components/SharedComponents';
import { PricingListItem, PricingHistoryEntry } from '../types';
import { getPricingProducts, savePricingProduct, getPricingHistory } from '../services/AppService';
import { Clock, Check } from 'lucide-react';

const ProductPricingDashboardPage: React.FC = () => {
  const [items, setItems] = useState<PricingListItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<PricingListItem[][]>([]);
  const [redoStack, setRedoStack] = useState<PricingListItem[][]>([]);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [historyEntries, setHistoryEntries] = useState<PricingHistoryEntry[]>([]);

  useEffect(() => {
    getPricingProducts()
      .then(setItems)
      .catch(err => console.error('Failed to load products', err));
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
    } catch (err) {
      console.error('Failed to save price', err);
    }
    setSavingId(null);
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

  return (
    <div className="space-y-4">
      <PageTitle title="Precificação de Produtos" />
      <Card title="Produtos" bodyClassName="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Produto</th>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Custo BRL</th>
                <th className="px-2 py-1 text-right">Valor de Tabela</th>
                <th className="px-2 py-1 text-right">Atualizado Em</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.productId}>
                  <td className="px-2 py-1">{it.productName}</td>
                  <td className="px-2 py-1">{it.categoryName}</td>
                  <td className="px-2 py-1 text-right">{it.custoBRL?.toFixed(2)}</td>
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
                    {savingId !== it.productId && editingId !== it.productId && (
                      <Clock className="inline ml-1 w-3 h-3 text-gray-500 cursor-pointer" onClick={() => { setHistoryFor(it.productId); loadHistory(it.productId); }} />
                    )}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('pt-BR') : ''}
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
