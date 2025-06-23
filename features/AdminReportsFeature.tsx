import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminReportsPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle title="Relatórios" subtitle="Análises por empresa e globais" />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Por empresa:
          <ul className="list-disc pl-5 space-y-1">
            <li>Total de pedidos</li>
            <li>Ticket médio</li>
            <li>Prazo médio de entrega</li>
            <li>Faturamento estimado</li>
          </ul>
        </li>
        <li>Relatórios globais (admin)</li>
        <li>Exportação em PDF/CSV</li>
      </ul>
    </Card>
  </div>
);

export default AdminReportsPage;
