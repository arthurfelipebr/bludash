import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, saveOrder } from '../services/AppService';
import { Order } from '../types';
import { PageTitle, Card, Spinner, Button } from '../components/SharedComponents';
import { OrderForm } from './OrdersFeature';

const OrderEditPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId).then(o => setOrder(o || null)).catch(() => setOrder(null));
    }
  }, [orderId]);

  const handleSave = async (updated: Order) => {
    await saveOrder(updated);
    navigate(`/orders/${updated.id}`);
  };

  if (!order) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title="Editar Encomenda"
        subtitle={`${order.productName} ${order.model}`}
        actions={<Button onClick={() => navigate(`/orders/${order.id}`)}>Cancelar</Button>}
      />
      <Card>
        <OrderForm
          isOpen={true}
          onClose={() => navigate(`/orders/${order.id}`)}
          onSave={handleSave}
          initialOrder={order}
          useModal={false}
        />
      </Card>
    </div>
  );
};

export default OrderEditPage;
