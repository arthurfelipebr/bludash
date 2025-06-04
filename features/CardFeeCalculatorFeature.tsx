
import React, { useState, useEffect, ReactNode } from 'react';
import { PageTitle, Card, Input, ResponsiveTable, Button } from '../components/SharedComponents';
import { 
  formatCurrencyBRL, 
  parseBRLCurrencyStringToNumber,
  formatNumberToBRLCurrencyInput,
  CREDIT_CARD_RATES_CONFIG,
  calculateCreditCardFees,
} from '../services/AppService';
import { CalculatedCardFeeResult } from '../types';

const PrintIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
);

export const CardFeeCalculatorPage: React.FC<{}> = () => {
  const [desiredNetValueInput, setDesiredNetValueInput] = useState<string>('R$ 0,00');
  const [desiredNetValue, setDesiredNetValue] = useState<number>(0);
  const [calculationResults, setCalculationResults] = useState<CalculatedCardFeeResult[]>([]);

  const handleCurrencyInputChange = (
    value: string, 
    setValueState: React.Dispatch<React.SetStateAction<number>>,
    setInputState: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setInputState(value);
    const numericValue = parseBRLCurrencyStringToNumber(value);
    setValueState(numericValue);
  };

  const handleCurrencyInputBlur = (
    currentValue: number,
    setInputState: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setInputState(formatNumberToBRLCurrencyInput(currentValue));
  };

  useEffect(() => {
    if (desiredNetValue > 0) {
      setCalculationResults(calculateCreditCardFees(desiredNetValue));
    } else {
      setCalculationResults([]);
    }
  }, [desiredNetValue]);
  
  const handlePrint = () => {
    const printSection = document.getElementById('cardFeePrintSection');
    if (printSection) {
        window.print();
    }
  };

  const columns = [
    { header: 'Nº Parcelas', accessor: (item: CalculatedCardFeeResult): ReactNode => `${item.installments}x` },
    { header: 'Taxa (%)', accessor: (item: CalculatedCardFeeResult): ReactNode => `${item.ratePercent.toFixed(2)}%` },
    { header: 'Valor a Cobrar (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.amountToChargeCustomer), className: 'font-semibold text-blue-600' },
    { header: 'Valor da Parcela (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.installmentValue) },
    { header: 'Custo Adicional (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.additionalCostToCustomer), className: 'text-orange-600' },
    { header: 'Líquido p/ Loja (R$)', accessor: (item: CalculatedCardFeeResult): ReactNode => formatCurrencyBRL(item.netValueForBluImports), className: 'text-green-600 no-print-column' }, // Added no-print-column
  ];

  return (
    <div className="card-fee-calculator-page">
      <PageTitle
        title="Calculadora de Taxas de Cartão de Crédito"
        subtitle="Calcule o valor a ser cobrado do cliente para atingir o valor líquido desejado após taxas."
      />
      <Card className="mb-6" bodyClassName="p-6 no-print"> {/* Added no-print to input card */}
        <div className="max-w-md">
          <Input
            label="Valor que a Blu Imports Deseja Receber (R$)"
            id="desiredNetValue"
            name="desiredNetValue"
            type="text" 
            value={desiredNetValueInput}
            onChange={(e) => handleCurrencyInputChange(e.target.value, setDesiredNetValue, setDesiredNetValueInput)}
            onBlur={() => handleCurrencyInputBlur(desiredNetValue, setDesiredNetValueInput)}
            placeholder="R$ 0,00"
            inputClassName="text-lg"
          />
        </div>
      </Card>

      {desiredNetValue > 0 && calculationResults.length > 0 && (
        <Card title="Resultados da Simulação de Taxas">
          <div id="cardFeePrintSection" className="print-section">
            <h3 className="text-xl font-semibold text-gray-800 mb-2 print-title">Simulação de Taxas de Cartão</h3>
            <p className="text-sm text-gray-600 mb-4 print-subtitle">
              Valor líquido desejado pela Blu Imports: <strong>{formatCurrencyBRL(desiredNetValue)}</strong>
            </p>
            <ResponsiveTable
              columns={columns}
              data={calculationResults}
              rowKeyAccessor="installments"
              emptyStateMessage="Nenhum resultado para calcular. Insira um valor desejado."
            />
            <p className="text-xs text-gray-500 mt-4 print-footer">Valores simulados. Taxas podem variar.</p>
          </div>
           <div className="mt-6 text-right no-print">
              <Button onClick={handlePrint} variant="secondary" leftIcon={<PrintIcon className="h-5 w-5" />}>
                Gerar Imagem / Imprimir
              </Button>
            </div>
        </Card>
      )}
      {desiredNetValue <= 0 && (
        <Card className="no-print"> {/* Added no-print */}
            <p className="text-center text-gray-500 py-4">Insira um valor desejado acima para calcular as taxas.</p>
        </Card>
      )}
      <style>{`
        @media print {
          body * { visibility: hidden; margin: 0; padding: 0; }
          .card-fee-calculator-page .print-section, .card-fee-calculator-page .print-section * { visibility: visible; }
          .card-fee-calculator-page .print-section .no-print-column, 
          .card-fee-calculator-page .print-section .no-print-column * { 
            display: none !important; 
            visibility: hidden !important;
          }
          .card-fee-calculator-page .print-section { 
            position: absolute; left: 20px; top: 20px; width: calc(100% - 40px); 
            font-family: Arial, sans-serif; 
          }
          .card-fee-calculator-page .print-section .print-title { font-size: 1.5rem; color: #1f2937; margin-bottom: 0.5rem; text-align: center;}
          .card-fee-calculator-page .print-section .print-subtitle { font-size: 0.9rem; color: #4b5563; margin-bottom: 1rem; text-align: center;}
          .card-fee-calculator-page .print-section table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .card-fee-calculator-page .print-section th, .card-fee-calculator-page .print-section td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 0.8rem; }
          .card-fee-calculator-page .print-section th { background-color: #f9fafb; font-weight: bold; }
          .card-fee-calculator-page .print-section .font-semibold { font-weight: bold; }
          .card-fee-calculator-page .print-section .text-blue-600 { color: #2563eb !important; }
          .card-fee-calculator-page .print-section .text-orange-600 { color: #ea580c !important; }
          .card-fee-calculator-page .print-section .text-green-600 { color: #16a34a !important; }
          .card-fee-calculator-page .print-section .print-footer { font-size: 0.7rem; color: #6b7280; margin-top: 1rem; text-align: center; }
          .card-fee-calculator-page .no-print, .card-fee-calculator-page > div:not(:has(.print-section)) { display: none !important; }
        }
      `}</style>
    </div>
  );
};
