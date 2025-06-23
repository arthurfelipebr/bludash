import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminOrdersPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle
      title="Gestão de Pedidos (Global)"
      subtitle="Acesso a todos os pedidos do sistema"
    />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Filtros por empresa, status e período</li>
        <li>Identificação de anomalias:
          <ul className="list-disc pl-5 space-y-1">
            <li>Pedido com valor errado</li>
            <li>Sem contrato ou nota</li>
          </ul>
        </li>
        <li>Logs de alterações por pedido</li>
      </ul>
    </Card>
  </div>
);

export default AdminOrdersPage;
