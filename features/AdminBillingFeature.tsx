import React, { useEffect, useState } from 'react';
import { PageTitle, Card, ResponsiveTable, Spinner, Alert, Button } from '../components/SharedComponents';
import { SubscriptionPlan, BillingClient, IntegrationStatus } from '../types';
import { getSubscriptionPlans, getBillingClients, getIntegrationStatuses, formatCurrencyBRL, formatDateBR } from '../services/AppService';

const AdminBillingPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c, i] = await Promise.all([
          getSubscriptionPlans(),
          getBillingClients(),
          getIntegrationStatuses(),
        ]);
        setPlans(p);
        setClients(c);
        setIntegrations(i);
      } catch (err) {
        setError('Falha ao carregar dados de faturamento.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const planColumns = [
    { header: 'Plano', accessor: (p: SubscriptionPlan) => p.name },
    { header: 'Limite Pedidos', accessor: (p: SubscriptionPlan) => p.orderLimit },
    { header: 'Limite Usuários', accessor: (p: SubscriptionPlan) => p.userLimit },
    { header: 'Recursos', accessor: (p: SubscriptionPlan) => p.features.join(', ') },
    { header: 'Preço Mensal', accessor: (p: SubscriptionPlan) => formatCurrencyBRL(p.monthlyPrice) },
    {
      header: 'Ações',
      accessor: () => (
        <div className="flex space-x-1">
          <Button size="sm" variant="link">Editar</Button>
          <Button size="sm" variant="danger">Excluir</Button>
        </div>
      ),
    },
  ];

  const clientColumns = [
    { header: 'Empresa', accessor: (c: BillingClient) => c.organizationName },
    { header: 'Plano', accessor: (c: BillingClient) => c.planName },
    { header: 'Último Pagamento', accessor: (c: BillingClient) => formatDateBR(c.lastPaymentDate, false) },
    { header: 'Próximo Vencimento', accessor: (c: BillingClient) => formatDateBR(c.nextDueDate, false) },
    { header: 'Status', accessor: (c: BillingClient) => c.status },
    {
      header: 'Ações',
      accessor: () => (
        <div className="flex space-x-1">
          <Button size="sm" variant="link">Ver detalhes</Button>
          <Button size="sm" variant="ghost">Cobrar</Button>
          <Button size="sm" variant="danger">Suspender</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Planos e Faturamento" subtitle="Configurar planos e acompanhar pagamentos" />
      <Card title="Planos Disponíveis" actions={<Button size="sm">+ Criar novo plano</Button>}>
        {loading ? (
          <Spinner />
        ) : error ? (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        ) : (
          <ResponsiveTable columns={planColumns} data={plans} rowKeyAccessor="id" />
        )}
      </Card>

      <Card title="Faturas por Cliente">
        {loading ? (
          <Spinner />
        ) : error ? (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        ) : (
          <ResponsiveTable columns={clientColumns} data={clients} rowKeyAccessor="clientId" />
        )}
      </Card>

      <Card title="Ferramentas">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm">Reprocessar Cobranças</Button>
          <Button size="sm">Enviar Fatura Manualmente</Button>
          <Button size="sm">Definir Política de Bloqueio</Button>
        </div>
        <h4 className="font-semibold mb-2">Integrações</h4>
        <ul className="space-y-1">
          {integrations.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>{i.name}</span>
              <span className={i.status === 'connected' ? 'text-green-600' : 'text-red-600'}>
                {i.status}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default AdminBillingPage;
