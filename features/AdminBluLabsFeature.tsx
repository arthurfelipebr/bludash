import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminBluLabsPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle title="Blu Labs / Produtos Experimentais" subtitle="Envio e acompanhamento de produtos em beta" />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Envio de novos produtos para beta testers</li>
        <li>Feedbacks recebidos por produto</li>
        <li>Aprovação ou arquivamento do item</li>
        <li>Acompanhamento de desempenho dos produtos após liberação</li>
      </ul>
    </Card>
  </div>
);

export default AdminBluLabsPage;
