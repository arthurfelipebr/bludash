import React, { useEffect, useState } from 'react';
import { Card } from './SharedComponents';

interface Reminder {
  id: string;
  text: string;
}

const REMINDERS: Reminder[] = [
  { id: 'export-invoices-monthly', text: 'Todo final de mês exportar notas fiscais do mês para a contabilidade.' }
];

export const RemindersWidget: React.FC = () => {
  const [status, setStatus] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('reminderStatus');
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem('reminderStatus', JSON.stringify(status));
  }, [status]);

  const toggle = (id: string) => {
    setStatus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card title="Lembretes" className="mb-6">
      <ul className="space-y-2">
        {REMINDERS.map(rem => (
          <li key={rem.id} className="flex items-start">
            <input
              id={rem.id}
              type="checkbox"
              checked={!!status[rem.id]}
              onChange={() => toggle(rem.id)}
              className="mt-1 mr-2 h-4 w-4 text-blu-primary border-gray-300 rounded"
            />
            <label htmlFor={rem.id} className="text-sm text-gray-800">
              {rem.text}
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default RemindersWidget;
