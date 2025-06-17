import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PageTitle, Card, Button, Input } from '../components/SharedComponents';

interface MonthlyTableRow {
  id: string;
  description: string;
  amount: number;
}

const STORAGE_KEY = 'monthlyTableData';

const loadData = (): Record<string, MonthlyTableRow[]> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveData = (data: Record<string, MonthlyTableRow[]>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const MonthlyTablePage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [tables, setTables] = useState<Record<string, MonthlyTableRow[]>>(loadData);

  useEffect(() => {
    saveData(tables);
  }, [tables]);

  const rows = tables[selectedMonth] || [];

  const addRow = () => {
    const newRow: MonthlyTableRow = { id: uuidv4(), description: '', amount: 0 };
    setTables(prev => ({ ...prev, [selectedMonth]: [...rows, newRow] }));
  };

  const updateRow = (id: string, field: 'description' | 'amount', value: string) => {
    setTables(prev => ({
      ...prev,
      [selectedMonth]: rows.map(r => r.id === id ? { ...r, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : r)
    }));
  };

  const deleteRow = (id: string) => {
    setTables(prev => ({ ...prev, [selectedMonth]: rows.filter(r => r.id !== id) }));
  };

  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div>
      <PageTitle title="Tabela do Mês" subtitle="Crie e edite valores mensais" />
      <Card className="mb-4">
        <div className="flex items-center space-x-2">
          <label htmlFor="month" className="text-sm font-medium">Mês:</label>
          <input
            id="month"
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border rounded p-1"
          />
          <Button onClick={addRow} className="ml-auto">Adicionar Linha</Button>
        </div>
      </Card>
      <Card>
        <table className="min-w-full table-auto">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Descrição</th>
              <th className="px-2 py-1 text-right">Valor (R$)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="px-2 py-1">
                  <Input
                    id={`desc-${row.id}`}
                    value={row.description}
                    onChange={e => updateRow(row.id, 'description', e.target.value)}
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <Input
                    id={`amt-${row.id}`}
                    type="number"
                    step="0.01"
                    value={row.amount.toString()}
                    onChange={e => updateRow(row.id, 'amount', e.target.value)}
                    className="text-right"
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <Button variant="danger" size="sm" onClick={() => deleteRow(row.id)}>Excluir</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-2 py-4 text-center text-sm text-gray-500" colSpan={3}>Nenhum dado para este mês.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-2 py-2 font-semibold text-right">Total:</td>
              <td className="px-2 py-2 font-semibold text-right">{total.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
};
export default MonthlyTablePage;
