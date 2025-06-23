import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminAIPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle title="IA / Automatizações" subtitle="Configurações de IA" />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Configurar quais IAs estão disponíveis (chatbot, recomendador, etc.)</li>
        <li>Logs de uso por empresa</li>
        <li>Upload de dados para treinar a IA</li>
        <li>Ativar/desativar IA por plano</li>
      </ul>
    </Card>
  </div>
);

export default AdminAIPage;
