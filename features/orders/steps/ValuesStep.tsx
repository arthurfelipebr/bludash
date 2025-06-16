import React from 'react';
import { Input, Select, Card, Button, WhatsAppIcon } from '../../../components/SharedComponents';
import { PaymentMethod, PAYMENT_METHOD_OPTIONS, BLU_FACILITA_CONTRACT_STATUS_OPTIONS, DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE, Supplier, SupplierOption, OrderStatus } from '../../../types';
import { ORDER_STATUS_OPTIONS, formatCurrencyBRL } from '../../../services/AppService';
import { OrderFormState } from '../../OrdersFeature';

interface ValuesStepProps {
  state: OrderFormState;
  suppliers: Supplier[];
  supplierOptions: SupplierOption[];
  bfProductValueForSim: number;
  bfDownPaymentInput: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleWhatsAppConsult: () => void;
  handleBfDownPaymentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBfDownPaymentBlur: () => void;
}

export const ValuesStep: React.FC<ValuesStepProps> = ({
  state,
  suppliers,
  supplierOptions,
  bfProductValueForSim,
  bfDownPaymentInput,
  handleChange,
  handleWhatsAppConsult,
  handleBfDownPaymentChange,
  handleBfDownPaymentBlur,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Valores, Fornecedor e Prazos" className="h-full">
          <h4 className="font-semibold text-gray-700 mb-2 mt-4 first:mt-0">Valores e Fornecedor</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Fornecedor"
              id="supplierId"
              name="supplierId"
              value={state.supplierId || ''}
              onChange={handleChange}
              options={supplierOptions}
            />
            {state.supplierId && suppliers.find(s => s.id === state.supplierId)?.phone && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleWhatsAppConsult}
                className="mt-6"
                leftIcon={<WhatsAppIcon className="h-5 w-5 text-green-500" />}
              >
                Consultar Fornecedor
              </Button>
            )}
          </div>
          <Input
            label="Custo (R$)"
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            step="0.01"
            value={String(state.purchasePrice || '')}
            onChange={handleChange}
            required
            containerClassName="mt-4"
          />
          <Input
            label="Valor de Venda (R$) (Opcional)"
            id="sellingPrice"
            name="sellingPrice"
            type="number"
            step="0.01"
            value={String(state.sellingPrice || '')}
            onChange={handleChange}
            containerClassName="mt-4"
          />

          <h4 className="font-semibold text-gray-700 mb-2 mt-4 first:mt-0">Prazos e Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Status Inicial"
              id="status"
              name="status"
              value={state.status}
              onChange={handleChange}
              options={ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
            />
            <Input
              label="Data do Pedido"
              id="orderDate"
              name="orderDate"
              type="date"
              value={state.orderDate}
              onChange={handleChange}
              required
            />
          </div>
          <Input
            label="Prazo Estimado de Entrega"
            id="estimatedDeliveryDate"
            name="estimatedDeliveryDate"
            type="date"
            value={state.estimatedDeliveryDate || ''}
            onChange={handleChange}
            containerClassName="mt-4"
          />
          {state.status === OrderStatus.ENTREGUE && (
            <Input
              label="Data de Entrega"
              id="deliveryDate"
              name="deliveryDate"
              type="date"
              value={state.deliveryDate || ''}
              onChange={handleChange}
              containerClassName="mt-4"
            />
          )}
          <h4 className="font-semibold text-gray-700 mb-2 mt-4 first:mt-0">Custos de Logística</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Custo Frete Fornecedor → Blu (R$)"
              id="shippingCostSupplierToBlu"
              name="shippingCostSupplierToBlu"
              type="number"
              step="0.01"
              value={String(state.shippingCostSupplierToBlu || '')}
              onChange={handleChange}
            />
            <Input
              label="Custo Frete Blu → Cliente (R$)"
              id="shippingCostBluToClient"
              name="shippingCostBluToClient"
              type="number"
              step="0.01"
              value={String(state.shippingCostBluToClient || '')}
              onChange={handleChange}
            />
          </div>
          <Input
            label="Código de Rastreamento (Correios)"
            id="trackingCode"
            name="trackingCode"
            value={state.trackingCode || ''}
            onChange={handleChange}
            containerClassName="mt-4"
          />
        </Card>
      </div>
      <Card title="Forma de Pagamento">
        <Select
          label="Forma de Pagamento"
          id="paymentMethod"
          name="paymentMethod"
          value={state.paymentMethod}
          onChange={handleChange}
          options={PAYMENT_METHOD_OPTIONS.map(p => ({ value: p, label: p }))}
        />
        {state.paymentMethod === PaymentMethod.BLU_FACILITA && (
          <div className="mt-4 p-4 border border-blue-200 rounded-md bg-blue-50 space-y-3">
            <h4 className="font-semibold text-blue-700">
              Simulação BluFacilita (Base: {formatCurrencyBRL(bfProductValueForSim)})
            </h4>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bluFacilitaUsesSpecialRate"
                name="bluFacilitaUsesSpecialRate"
                checked={state.bluFacilitaUsesSpecialRate}
                onChange={handleChange}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="bluFacilitaUsesSpecialRate" className="text-sm text-gray-700">
                Usar Taxa Especial BluFacilita?
              </label>
            </div>
            {state.bluFacilitaUsesSpecialRate && (
              <Input
                label="Taxa Anual Especial (%)"
                id="bluFacilitaSpecialAnnualRate"
                name="bluFacilitaSpecialAnnualRate"
                type="number"
                step="0.01"
                value={String(state.bluFacilitaSpecialAnnualRate || '')}
                onChange={handleChange}
                placeholder={`Padrão ${DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE * 100}%`}
              />
            )}
            <Input
              label="Entrada (R$)"
              id="bfDownPaymentInput"
              name="bfDownPaymentInput"
              value={bfDownPaymentInput}
              onChange={handleBfDownPaymentChange}
              onBlur={handleBfDownPaymentBlur}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Nº de Parcelas"
                id="installments"
                name="installments"
                value={String(state.installments || 12)}
                onChange={handleChange}
                options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}x` }))}
              />
            </div>
            <p className="text-sm">
              <strong>Valor Financiado:</strong> {formatCurrencyBRL(state.financedAmount)}
            </p>
            <p className="text-sm">
              <strong>Valor da Parcela:</strong> {formatCurrencyBRL(state.installmentValue)}
            </p>
            <p className="text-sm">
              <strong>Total com Juros (Financiamento + Entrada):</strong>{' '}
              {formatCurrencyBRL((state.totalWithInterest || 0) + (state.downPayment || 0))}
            </p>
            <Select
              label="Status do Contrato BluFacilita"
              id="bluFacilitaContractStatus"
              name="bluFacilitaContractStatus"
              value={state.bluFacilitaContractStatus}
              onChange={handleChange}
              options={BLU_FACILITA_CONTRACT_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
            />
          </div>
        )}
      </Card>
    </>
  );
};

export default ValuesStep;
