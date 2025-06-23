import React, { useEffect, useState } from 'react';
import { PageTitle, Card, Spinner } from '../components/SharedComponents';

interface AdminSummary {
  activeOrganizations: number;
  ongoingOrders: number;
  totalRevenue: number;
}

const AdminHomePage: React.FC = () => {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/summary', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(err => {
        console.error('Failed to load admin summary', err);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const MetricCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <Card className="p-4 flex flex-col items-center justify-center text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-800 mt-1">{value}</p>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Painel Administrativo" subtitle="Visão geral do sistema" />
      {loading && <Spinner />}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="Empresas Ativas" value={summary.activeOrganizations} />
          <MetricCard label="Pedidos em Andamento" value={summary.ongoingOrders} />
          <MetricCard label="Faturamento Total Estimado" value={`R$ ${summary.totalRevenue.toFixed(2)}`} />
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-2">Notificações de Pendências</h2>
        <p className="text-gray-600 text-sm">Pedidos sem nota fiscal, sem contrato ou pagamentos pendentes.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Logs Recentes</h2>
        <p className="text-gray-600 text-sm">Últimas ações dos usuários e falhas de API.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Gestão de Usuários / Clientes</h2>
        <p className="text-gray-600 text-sm">Administre contas de empresas e usuários.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Planos e Faturamento</h2>
        <p className="text-gray-600 text-sm">Configuração de planos e acompanhamento de pagamentos.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Gestão de Pedidos (Global)</h2>
        <p className="text-gray-600 text-sm">Acesso a todos os pedidos do sistema com filtros avançados.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Gestão de Produtos / Modelos</h2>
        <p className="text-gray-600 text-sm">Cadastro global de modelos e atualização em massa.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Relatórios</h2>
        <p className="text-gray-600 text-sm">Relatórios globais e exportação em PDF/CSV.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">IA / Automatizações</h2>
        <p className="text-gray-600 text-sm">Configuração e acompanhamento de IAs disponíveis.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Blu Labs / Produtos Experimentais</h2>
        <p className="text-gray-600 text-sm">Envio de novos produtos para beta testers e acompanhamento.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Configurações Avançadas</h2>
        <p className="text-gray-600 text-sm">Textos padrão, integrações externas e parâmetros do sistema.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Auditoria e Logs</h2>
        <p className="text-gray-600 text-sm">Logs completos e exportação cronológica.</p>
      </Card>
    </div>
  );
};

export default AdminHomePage;
