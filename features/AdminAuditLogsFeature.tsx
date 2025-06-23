import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminAuditLogsPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle title="Auditoria e Logs" subtitle="Monitoramento completo do sistema" />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Logs completos do sistema:
          <ul className="list-disc pl-5 space-y-1">
            <li>Ação, data, usuário, IP</li>
          </ul>
        </li>
        <li>Logs filtrados por empresa</li>
        <li>Exportação de logs em .csv ou visualização cronológica</li>
      </ul>
    </Card>
  </div>
);

export default AdminAuditLogsPage;
