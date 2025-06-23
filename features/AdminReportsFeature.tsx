import React, { useEffect, useState } from 'react';
import { PageTitle, Card, Spinner, Alert } from '../components/SharedComponents';
import { getAdminReport, AdminReport, formatCurrencyBRL } from '../services/AppService';

const AdminReportsPage: React.FC = () => {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminReport();
        setReport(data);
      } catch (err: any) {
        setError('Falha ao carregar relatório.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Relatórios" subtitle="Visão geral consolidada" />
      <Card>
        {loading ? (
          <Spinner />
        ) : error ? (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        ) : report ? (
          <div className="space-y-2">
            <Metric label="Empresas" value={report.organizations} />
            <Metric label="Usuários" value={report.users} />
            <Metric label="Clientes" value={report.clients} />
            <Metric label="Fornecedores" value={report.suppliers} />
            <Metric label="Pedidos" value={report.orders} />
            <Metric label="Faturamento Total" value={formatCurrencyBRL(report.totalRevenue)} />
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default AdminReportsPage;
