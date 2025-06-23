import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminSettingsPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle title="Configurações Avançadas" subtitle="Textos e integrações globais" />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Textos padrão globais:
          <ul className="list-disc pl-5 space-y-1">
            <li>Nota fiscal</li>
            <li>Contrato Autentique</li>
            <li>E-mails automáticos</li>
          </ul>
        </li>
        <li>Parâmetros do sistema:
          <ul className="list-disc pl-5 space-y-1">
            <li>Prazos padrão</li>
            <li>Limites por plano</li>
          </ul>
        </li>
        <li>Integrações externas: Firebase, WhatsApp, Autentique, ASAAS, Gemini API etc.</li>
      </ul>
    </Card>
  </div>
);

export default AdminSettingsPage;
