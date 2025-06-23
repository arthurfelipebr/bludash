import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminBillingPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle
      title="Planos e Faturamento"
      subtitle="Configurar planos e acompanhar pagamentos"
    />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Configurar planos (Lite, Pro, Enterprise)</li>
        <li>Limites por plano (ex: nº de pedidos, usuários, IA)</li>
        <li>Integração com gateways (Stripe, ASAAS, Juno, etc.)</li>
        <li>Histórico de pagamentos por empresa</li>
        <li>
          Alerta de inadimplência com opção de avisar por e-mail/WhatsApp ou
          bloqueio automático
        </li>
      </ul>
    </Card>
  </div>
);

export default AdminBillingPage;
