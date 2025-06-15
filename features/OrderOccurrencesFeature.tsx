import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrderById,
  getOrderOccurrences,
  saveOrderOccurrence,
  deleteOrderOccurrence,
  formatDateBR,
} from '../services/AppService';
import {
  Order,
  OrderOccurrence,
  OCCURRENCE_TYPE_OPTIONS,
  OCCURRENCE_STATUS_OPTIONS,
  OccurrenceType,
  OccurrenceStatus,
} from '../types';
import {
  PageTitle,
  Card,
  Select,
  Textarea,
  Input,
  Button,
  Alert,
} from '../components/SharedComponents';
import { v4 as uuidv4 } from 'uuid';

const OrderOccurrencesPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [occurrences, setOccurrences] = useState<OrderOccurrence[]>([]);
  const [type, setType] = useState<OccurrenceType>(OccurrenceType.PRODUTO_COM_DEFEITO);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<OccurrenceStatus>(OccurrenceStatus.ABERTO);
  const [responsible, setResponsible] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId)
        .then(o => setOrder(o || null))
        .catch(console.error);
      getOrderOccurrences(orderId).then(setOccurrences).catch(console.error);
    }
  }, [orderId]);

  const handleSubmit = async () => {
    if (!orderId) return;
    try {
      const newOccurrence: OrderOccurrence = {
        id: uuidv4(),
        orderId,
        type,
        description,
        status,
        responsible: responsible || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: [],
      };
      const saved = await saveOrderOccurrence(orderId, newOccurrence);
      setOccurrences(prev => [...prev, saved]);
      setDescription('');
      setResponsible('');
      setType(OccurrenceType.PRODUTO_COM_DEFEITO);
      setStatus(OccurrenceStatus.ABERTO);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar ocorrência');
    }
  };

  const handleDelete = async (id: string) => {
    if (!orderId) return;
    if (!window.confirm('Remover ocorrência?')) return;
    await deleteOrderOccurrence(orderId, id);
    setOccurrences(prev => prev.filter(o => o.id !== id));
  };

  return (
    <div>
      <PageTitle
        title={`Ocorrências`}
        subtitle={order ? `${order.productName} - ${order.customerName}` : ''}
        actions={<Button onClick={() => navigate(-1)}>Voltar</Button>}
      />
      <Card title="Registrar Nova Ocorrência">
        <div className="space-y-2">
          <Select
            id="occType"
            label="Tipo"
            options={OCCURRENCE_TYPE_OPTIONS.map(t => ({ value: t, label: t }))}
            value={type}
            onChange={e => setType(e.target.value as OccurrenceType)}
          />
          <Textarea
            id="occDesc"
            label="Descrição"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Select
            id="occStatus"
            label="Status"
            options={OCCURRENCE_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
            value={status}
            onChange={e => setStatus(e.target.value as OccurrenceStatus)}
          />
          <Input
            id="occResp"
            label="Responsável Interno"
            value={responsible}
            onChange={e => setResponsible(e.target.value)}
          />
          {error && <Alert type="error" message={error} />}
          <Button onClick={handleSubmit}>Adicionar</Button>
        </div>
      </Card>
      <Card title="Histórico" className="mt-4">
        {occurrences.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma ocorrência registrada.</p>
        ) : (
          <ul className="space-y-3">
            {occurrences.map(o => (
              <li key={o.id} className="border-b pb-2 text-sm">
                <p>
                  <strong>Tipo:</strong> {o.type} - <strong>Status:</strong> {o.status}
                </p>
                <p>
                  <strong>Responsável:</strong> {o.responsible || 'N/A'} -{' '}
                  <strong>Abertura:</strong> {formatDateBR(o.createdAt, true)}
                </p>
                <p className="whitespace-pre-wrap">{o.description}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-red-500"
                  onClick={() => handleDelete(o.id)}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default OrderOccurrencesPage;
