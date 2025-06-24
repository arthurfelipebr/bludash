import React, { useEffect, useState } from 'react';
import { PageTitle, Card, ResponsiveTable, Spinner, Alert, Button, Modal, Input, Textarea } from '../components/SharedComponents';
import { SubscriptionPlan, BillingClient, IntegrationStatus } from '../types';
import {
  getSubscriptionPlans,
  getBillingClients,
  getIntegrationStatuses,
  saveSubscriptionPlan,
  deleteSubscriptionPlan,
  formatCurrencyBRL,
  formatDateBR,
} from '../services/AppService';

const PlanForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SubscriptionPlan>) => Promise<void>;
  plan?: SubscriptionPlan | null;
}> = ({ isOpen, onClose, onSave, plan }) => {
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({});
  const [featuresInput, setFeaturesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setFormData(plan);
      setFeaturesInput(plan.features.join(', '));
    } else {
      setFormData({});
      setFeaturesInput('');
    }
  }, [plan, isOpen]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        ...formData,
        features: featuresInput.split(',').map(f => f.trim()).filter(Boolean),
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={plan ? 'Editar Plano' : 'Novo Plano'}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      <Input label="Nome" id="plan-name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
      <Input label="Limite de Pedidos" id="plan-orders" type="number" value={formData.orderLimit?.toString() || ''} onChange={e => setFormData({ ...formData, orderLimit: parseInt(e.target.value, 10) })} />
      <Input label="Limite de Usuários" id="plan-users" type="number" value={formData.userLimit?.toString() || ''} onChange={e => setFormData({ ...formData, userLimit: parseInt(e.target.value, 10) })} />
      <Textarea label="Recursos (separados por vírgula)" id="plan-features" value={featuresInput} onChange={e => setFeaturesInput(e.target.value)} textareaClassName="h-20" />
      <Input label="Preço Mensal" id="plan-price" type="number" step="0.01" value={formData.monthlyPrice?.toString() || ''} onChange={e => setFormData({ ...formData, monthlyPrice: parseFloat(e.target.value) })} />
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} isLoading={saving}>Salvar</Button>
      </div>
    </Modal>
  );
};

const AdminBillingPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);

  const loadData = async () => {
    try {
      const [p, c, i] = await Promise.all([
        getSubscriptionPlans(),
        getBillingClients(),
        getIntegrationStatuses(),
      ]);
      setPlans(p);
      setClients(c);
      setIntegrations(i);
      setError(null);
    } catch (err) {
      setError('Falha ao carregar dados de faturamento.');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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

  const handleSavePlan = async (data: Partial<SubscriptionPlan>) => {
    await saveSubscriptionPlan({ ...editing, ...data, id: editing?.id });
    setEditing(null);
    setFormOpen(false);
    loadData();
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Excluir este plano?')) return;
    await deleteSubscriptionPlan(id);
    loadData();
  };

  const planColumns = [
    { header: 'Plano', accessor: (p: SubscriptionPlan) => p.name },
    { header: 'Limite Pedidos', accessor: (p: SubscriptionPlan) => p.orderLimit },
    { header: 'Limite Usuários', accessor: (p: SubscriptionPlan) => p.userLimit },
    { header: 'Recursos', accessor: (p: SubscriptionPlan) => p.features.join(', ') },
    { header: 'Preço Mensal', accessor: (p: SubscriptionPlan) => formatCurrencyBRL(p.monthlyPrice) },
    {
      header: 'Ações',
      accessor: (p: SubscriptionPlan) => (
        <div className="flex space-x-1">
          <Button size="sm" variant="link" onClick={() => { setEditing(p); setFormOpen(true); }}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeletePlan(p.id)}>Excluir</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Planos e Faturamento" subtitle="Configurar planos e acompanhar pagamentos" />
      <Card title="Planos Disponíveis" actions={<Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>+ Criar novo plano</Button>}>
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
      <PlanForm isOpen={isFormOpen} onClose={() => setFormOpen(false)} onSave={handleSavePlan} plan={editing} />
    </div>
  );
};

export default AdminBillingPage;
