import React, { useEffect, useState } from 'react';
import { PageTitle, Card, ResponsiveTable, Spinner, Alert } from '../components/SharedComponents';
import { Order } from '../types';
import { getAdminOrders, formatCurrencyBRL, formatDateBR } from '../services/AppService';

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminOrders();
        setOrders(data);
      } catch (err: any) {
        setError('Falha ao carregar pedidos.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const columns = [
    { header: 'Empresa', accessor: (o: Order) => o.organizationName || '-' },
    { header: 'Cliente', accessor: (o: Order) => o.customerName },
    { header: 'Produto', accessor: (o: Order) => o.productName },
    { header: 'Valor', accessor: (o: Order) => formatCurrencyBRL(o.sellingPrice) },
    { header: 'Status', accessor: (o: Order) => o.status },
    { header: 'Data', accessor: (o: Order) => formatDateBR(o.orderDate) },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Gestão de Pedidos (Global)" subtitle="Acesso a todos os pedidos do sistema" />
      <Card>
        {loading ? (
          <Spinner />
        ) : error ? (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        ) : (
          <ResponsiveTable columns={columns} data={orders} rowKeyAccessor="id" />
        )}
      </Card>
    </div>
  );
};

export default AdminOrdersPage;
