import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, formatDateBR } from '../services/AppService';
import { Order, OrderStatus } from '../types';
import { Card, Button, Spinner } from './SharedComponents';

const ACTION_STATUSES: OrderStatus[] = [
  OrderStatus.AGUARDANDO_PAGAMENTO_FORNECEDOR,
  OrderStatus.AGUARDANDO_EMBALAR,
  OrderStatus.AGUARDANDO_GERAR_NF,
];

const PendingOrdersWidget: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const all = await getOrders();
        setOrders(all.filter(o => ACTION_STATUSES.includes(o.status as OrderStatus)));
      } catch (e) {
        console.error('Falha ao carregar pedidos pendentes', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <Card title="Pedidos aguardando ação" className="mb-6 flex justify-center p-4">
        <Spinner />
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card title="Pedidos aguardando ação" className="mb-6">
        <p className="p-4 text-center text-gray-500">Nenhum pedido pendente.</p>
      </Card>
    );
  }

  const viewOrder = (id: string) => {
    navigate(`/orders/${id}`);
  };

  return (
    <Card title="Pedidos aguardando ação" className="mb-6">
      <ul className="divide-y divide-gray-200">
        {orders.map(o => (
          <li key={o.id} className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-gray-800">{o.productName} {o.model}</p>
              <p className="text-sm text-gray-600">
                {o.customerName} - {formatDateBR(o.orderDate)}
              </p>
              <span className="text-xs text-yellow-700 font-semibold">{o.status}</span>
            </div>
            <Button variant="link" size="sm" onClick={() => viewOrder(o.id)}>
              Ver
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default PendingOrdersWidget;
