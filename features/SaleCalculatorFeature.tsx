import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { PageTitle, Card, Input, Select, ResponsiveTable, Button, ClipboardDocumentIcon } from '../components/SharedComponents';
import html2canvas from 'html2canvas';
import {
  formatCurrencyBRL,
  parseBRLCurrencyStringToNumber,
  formatNumberToBRLCurrencyInput,
  PAYMENT_METHOD_OPTIONS,
  calculateCreditCardFees,
} from '../services/AppService';
import { PaymentMethod, CalculatedCardFeeResult } from '../types';

const SHIPPING_COST = 50;

export const SaleCalculatorPage: React.FC<{}> = () => {
  const [productName, setProductName] = useState('');
  const [productPriceInput, setProductPriceInput] = useState('R$ 0,00');
  const [productPrice, setProductPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.A_VISTA);
  const [calculationResults, setCalculationResults] = useState<CalculatedCardFeeResult[]>([]);
  const [profitPercentInput, setProfitPercentInput] = useState('0');
  const [profitPercent, setProfitPercent] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePriceChange = (value: string) => {
    setProductPriceInput(value);
    const numeric = parseBRLCurrencyStringToNumber(value);
    setProductPrice(numeric);
  };

  const handlePriceBlur = () => {
    setProductPriceInput(formatNumberToBRLCurrencyInput(productPrice));
  };

  const handleProfitChange = (value: string) => {
    setProfitPercentInput(value);
    const numeric = parseFloat(value.replace(',', '.'));
    setProfitPercent(isNaN(numeric) ? 0 : numeric);
  };

  const totalWithProfit = productPrice * (1 + profitPercent / 100) + SHIPPING_COST;

  const handleExportImage = async () => {
    if (!printRef.current) return;
    const elementsToHide = printRef.current.querySelectorAll('.hide-on-export');
    elementsToHide.forEach(el => el.classList.add('screenshot-hidden'));
    const canvas = await html2canvas(printRef.current as HTMLElement);
    elementsToHide.forEach(el => el.classList.remove('screenshot-hidden'));
    const img = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = img;
    link.download = 'calculo-venda.png';
    link.click();
  };

  useEffect(() => {
    if (paymentMethod === PaymentMethod.CARTAO_CREDITO && productPrice > 0) {
      const total = productPrice * (1 + profitPercent / 100) + SHIPPING_COST;
      setCalculationResults(calculateCreditCardFees(total));
    } else {
      setCalculationResults([]);
    }
  }, [paymentMethod, productPrice, profitPercent]);

  const columns = [
    { header: 'Nº Parcelas', accessor: (item: CalculatedCardFeeResult): ReactNode => `${item.installments}x` },
    { header: 'Taxa (%)', accessor: (item: CalculatedCardFeeResult): ReactNode => `${item.ratePercent.toFixed(2)}%` },
    { header: 'Valor a Cobrar (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.amountToChargeCustomer), className: 'font-semibold text-blue-600' },
    { header: 'Valor da Parcela (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.installmentValue) },
    { header: 'Custo Adicional (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.additionalCostToCustomer), className: 'text-orange-600' },
    { header: 'Líquido p/ Blu Imports (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.netValueForBluImports), className: 'text-green-600 hide-on-export', headerClassName: 'hide-on-export' },
  ];

  return (
    <div className="sale-calculator-page">
      <PageTitle title="Calculadora de Venda" subtitle="Estime valores considerando frete fixo e taxas de cartão." />
      <Card className="mb-6" bodyClassName="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome do Produto"
            id="productName"
            name="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <Input
            label="Valor do Produto (R$)"
            id="productPrice"
            name="productPrice"
            value={productPriceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
            onBlur={handlePriceBlur}
            placeholder="R$ 0,00"
          />
          <Input
            label="Frete (R$)"
            id="shipping"
            name="shipping"
            value={formatNumberToBRLCurrencyInput(SHIPPING_COST)}
            disabled
          />
          <Input
            label="Lucro (%)"
            id="profit"
            name="profit"
            type="number"
            value={profitPercentInput}
            onChange={(e) => handleProfitChange(e.target.value)}
            placeholder="0"
          />
          <Select
            label="Método de Pagamento"
            id="paymentMethod"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={PAYMENT_METHOD_OPTIONS.map(p => ({ value: p, label: p }))}
          />
        </div>
      </Card>
      {paymentMethod === PaymentMethod.CARTAO_CREDITO && calculationResults.length > 0 && (
        <Card title="Simulação de Cartão de Crédito" actions={<Button variant="secondary" onClick={handleExportImage} leftIcon={<ClipboardDocumentIcon className="h-5 w-5" />}>Exportar Imagem</Button>}>
          <div ref={printRef}>
            <p className="text-sm text-gray-600 mb-2 hide-on-export">
              Total com frete e lucro: <strong>{formatCurrencyBRL(totalWithProfit)}</strong>
            </p>
            <ResponsiveTable columns={columns} data={calculationResults} rowKeyAccessor="installments" emptyStateMessage="Nenhum resultado" />
          </div>
        </Card>
      )}
      {paymentMethod !== PaymentMethod.CARTAO_CREDITO && productPrice > 0 && (
        <Card title="Resumo" actions={<Button variant="secondary" onClick={handleExportImage} leftIcon={<ClipboardDocumentIcon className="h-5 w-5" />}>Exportar Imagem</Button>}>
          <div ref={printRef}>
            <p className="text-sm">Produto: <strong>{productName || 'N/A'}</strong></p>
            <p className="text-sm">Método de Pagamento: <strong>{paymentMethod}</strong></p>
            <p className="text-sm">Total a Receber: <strong>{formatCurrencyBRL(totalWithProfit)}</strong></p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SaleCalculatorPage;
