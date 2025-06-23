import React, { useEffect, useState } from 'react';
import { SaaSClient } from '../types';
import { getSaaSClients, formatDateBR } from '../services/AppService';
import { PageTitle, Card, ResponsiveTable, Spinner, Alert } from '../components/SharedComponents';

const SaaSClientsAdminPage: React.FC = () => {
  const [clients, setClients] = useState<SaaSClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSaaSClients();
        setClients(data);
      } catch (err: any) {
        setError('Falha ao carregar clientes.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const columns = [
    { header: 'Organização', accessor: (c: SaaSClient) => c.organizationName },
    { header: 'E-mail', accessor: (c: SaaSClient) => c.contactEmail },
    { header: 'Plano', accessor: (c: SaaSClient) => c.subscriptionPlan },
    { header: 'Status', accessor: (c: SaaSClient) => c.subscriptionStatus },
    { header: 'Cadastro', accessor: (c: SaaSClient) => formatDateBR(c.signupDate, true) },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Clientes do SAAS" subtitle="Gerencie organizações assinantes" />
      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        ) : (
          <ResponsiveTable columns={columns} data={clients} rowKeyAccessor="id" />
        )}
      </Card>
    </div>
  );
};

export default SaaSClientsAdminPage;
