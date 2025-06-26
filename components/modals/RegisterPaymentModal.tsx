import React, { useState, useEffect } from 'react';
import { Modal, Button, Select as SharedSelect, Input as SharedInput, Textarea as SharedTextarea, Alert } from '../SharedComponents';
import { getClientById as getClientByIdService, addClientPayment, formatNumberToBRLCurrencyInput, parseBRLCurrencyStringToNumber } from '../../services/AppService';
import { Order, ClientPayment, PaymentMethod } from '../../types';

interface RegisterPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSaved: (payment: ClientPayment) => void;
}

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({ order, isOpen, onClose, onPaymentSaved }) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaidInput, setAmountPaidInput] = useState('R$ 0,00');
  type SimplePaymentMethod = ClientPayment["paymentMethodUsed"];
  const [paymentMethodUsed, setPaymentMethodUsed] = useState<SimplePaymentMethod>("PIX");
  const [installments, setInstallments] = useState(2);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const fetchClientName = async () => {
      if (order?.clientId) {
        try {
          const client = await getClientByIdService(order.clientId);
          setClientName(client?.fullName || order.customerName);
        } catch {
          setClientName(order.customerName);
        }
      } else if (order) {
        setClientName(order.customerName);
      }
    };

    if (isOpen && order) {
      fetchClientName();
      setPaymentDate(new Date().toISOString().split('T')[0]);
      if (order.paymentMethod === PaymentMethod.BLU_FACILITA && order.bluFacilitaInstallments) {
        const nextPendingInstallment = order.bluFacilitaInstallments.find(inst =>
          inst.status === 'Pendente' || inst.status === 'Atrasado' || inst.status === 'Pago Parcialmente'
        );
        const suggestedAmount = nextPendingInstallment
          ? nextPendingInstallment.amount - (nextPendingInstallment.amountPaid || 0)
          : order.installmentValue || 0;
        setAmountPaidInput(formatNumberToBRLCurrencyInput(suggestedAmount > 0 ? suggestedAmount : 0));
      } else {
        setAmountPaidInput(formatNumberToBRLCurrencyInput(order.sellingPrice || 0));
      }
      setPaymentMethodUsed('PIX');
      setInstallments(2);
      setNotes('');
      setError(null);
    }
  }, [isOpen, order]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setAmountPaidInput(e.target.value);
  const handleAmountBlur = () =>
    setAmountPaidInput(formatNumberToBRLCurrencyInput(parseBRLCurrencyStringToNumber(amountPaidInput)));

  const handleSubmit = async () => {
    if (!order) {
      setError('Encomenda não especificada.');
      return;
    }
    const amountPaid = parseBRLCurrencyStringToNumber(amountPaidInput);
    if (amountPaid <= 0) {
      setError('O valor pago deve ser maior que zero.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const paymentData: Omit<ClientPayment, 'id' | 'userId'> = {
        orderId: order.id,
        paymentDate,
        amountPaid,
        paymentMethodUsed,
        installments: paymentMethodUsed === 'Cartão de Crédito' ? installments : undefined,
        notes,
      };
      const savedPayment = await addClientPayment(paymentData);
      onPaymentSaved(savedPayment);
      onClose();
    } catch (err) {
      setError('Falha ao registrar pagamento: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const paymentMethodOptions = [
    { value: 'PIX', label: 'PIX' },
    { value: 'Transferência Bancária', label: 'Transferência Bancária' },
    { value: 'Dinheiro', label: 'Dinheiro' },
    { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
    { value: 'Outro', label: 'Outro' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Recebimento`} size="lg">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        <p>
          <strong>Cliente:</strong> {clientName}
        </p>
        <p>
          <strong>Produto:</strong> {order?.productName} {order?.model}
        </p>
        <SharedInput
          label="Data do Recebimento"
          id="paymentDate"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
        <SharedInput
          label="Valor Recebido (R$)"
          id="amountPaid"
          value={amountPaidInput}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          required
        />
        <SharedSelect
          label="Forma de Pagamento Usada"
          id="paymentMethodUsed"
          value={paymentMethodUsed}
          onChange={(e) => setPaymentMethodUsed(e.target.value  as SimplePaymentMethod)}
          options={paymentMethodOptions}
          required
        />
        {paymentMethodUsed === 'Cartão de Crédito' && (
          <SharedSelect
            label="Número de Parcelas"
            id="installments"
            value={String(installments)}
            onChange={(e) => setInstallments(parseInt(e.target.value))}
            options={Array.from({ length: 11 }, (_, i) => ({ value: i + 2, label: `${i + 2}x` }))}
          />
        )}
        <SharedTextarea
          label="Observações (Opcional)"
          id="paymentNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            Salvar Recebimento
          </Button>
        </div>
      </div>
    </Modal>
  );
};
