import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminHomePage: React.FC = () => (
  <div className="space-y-4">
    <PageTitle title="Painel Admin" subtitle="Acesso restrito" />
    <Card>
      <p>Bem-vindo à área administrativa.</p>
    </Card>
  </div>
);

export default AdminHomePage;
