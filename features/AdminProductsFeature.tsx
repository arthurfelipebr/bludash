import React from 'react';
import { PageTitle, Card } from '../components/SharedComponents';

const AdminProductsPage: React.FC = () => (
  <div className="space-y-6">
    <PageTitle
      title="Gestão de Produtos / Modelos"
      subtitle="Cadastro global de modelos e atualização em massa"
    />
    <Card>
      <ul className="list-disc pl-5 space-y-1">
        <li>Cadastro global de modelos (nome, armazenamento, specs)</li>
        <li>Atualização de specs padrão por modelo</li>
        <li>Atualização em massa para clientes que usam esse modelo</li>
        <li>Comparador interno para detectar divergências entre fornecedores</li>
      </ul>
    </Card>
  </div>
);

export default AdminProductsPage;
