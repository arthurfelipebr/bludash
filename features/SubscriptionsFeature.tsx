import React, { useState, useEffect } from 'react';
import { Subscription } from '../types';
import { getSubscriptions } from '../services/AppService';
import { PageTitle, Card, ResponsiveTable, Select, Alert, Spinner } from '../components/SharedComponents';
import { formatDateBR } from '../services/AppService';
import { useAuth } from '../Auth';

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Ativa' },
  { value: 'suspended', label: 'Suspensa' },
  { value: 'cancelled', label: 'Cancelada' },
];

export const SubscriptionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const data = await getSubscriptions(status || undefined);
      setSubs(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar assinaturas.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, [status]);

  if (currentUser?.role !== 'admin') {
    return <Alert type="error" message="Acesso negado." onClose={undefined} />;
  }

  const columns = [
    { header: 'Cliente', accessor: (s: Subscription) => s.clientId },
    { header: 'Plano', accessor: (s: Subscription) => s.plan },
    { header: 'Status', accessor: (s: Subscription) => s.status },
    { header: 'Início', accessor: (s: Subscription) => formatDateBR(s.startDate, true) },
    { header: 'Fim', accessor: (s: Subscription) => s.endDate ? formatDateBR(s.endDate, true) : '-' },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Assinaturas" subtitle="Gerencie assinaturas dos clientes" />
      <Card actions={<Select id="statusFilter" value={status} onChange={e => setStatus(e.target.value)} options={STATUS_OPTIONS} label="Status" />}>
        {loading ? <Spinner /> : error ? <Alert type="error" message={error} onClose={() => setError(null)} /> : (
          <ResponsiveTable columns={columns} data={subs} rowKeyAccessor="id" />
        )}
      </Card>
    </div>
  );
};
