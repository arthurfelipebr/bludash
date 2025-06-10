import React, { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { AggregatedProductPrice, HistoricalParsedProduct, Supplier } from '../types';
import {
  parseSupplierListWithGemini,
  aggregateSupplierData,
  getSuppliers,
  saveHistoricalParsedProducts,
  getHistoricalParsedProducts,
  isGeminiAvailable,
  formatCurrencyBRL,
  deleteAllHistoricalProductsForUser,
} from '../services/AppService';
import {
  Button,
  Card,
  PageTitle,
  Textarea,
  Select,
  Input,
  ResponsiveTable,
  Modal,
  Alert,
  Spinner,
} from '../components/SharedComponents';
import { v4 as uuidv4 } from 'uuid';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const MarketAnalysisPage: React.FC<{}> = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [priceListText, setPriceListText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const [historicalData, setHistoricalData] = useState<HistoricalParsedProduct[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedProductPrice[]>([]);
  const [profitMargin, setProfitMargin] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState<AggregatedProductPrice | null>(null);

  const supplierOptions = useMemo(() => [
    { value: '', label: 'Selecione um Fornecedor...' },
    ...suppliers.map(s => ({ value: s.id, label: s.name }))
  ], [suppliers]);

  const fetchSuppliers = useCallback(async () => {
    try {
      setSuppliers(await getSuppliers());
    } catch (err) {
      console.error('Failed to fetch suppliers', err);
    }
  }, []);

  const fetchHistoricalAndAggregate = useCallback(async () => {
    try {
      const raw = await getHistoricalParsedProducts();
      setHistoricalData(raw);
      setAggregatedData(await aggregateSupplierData(raw));
    } catch (err) {
      console.error('Failed loading historical data', err);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchHistoricalAndAggregate();
  }, [fetchSuppliers, fetchHistoricalAndAggregate]);

  const handleProcessList = async () => {
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      setProcessingError('Por favor, selecione um fornecedor cadastrado.');
      return;
    }
    if (!priceListText.trim()) {
      setProcessingError('A lista de preços não pode estar vazia.');
      return;
    }
    if (!isGeminiAvailable()) {
      setProcessingError('Serviço de IA (Gemini) não está disponível.');
      return;
    }
    setIsProcessing(true);
    setProcessingError(null);
    try {
      const parsed = await parseSupplierListWithGemini(priceListText, supplier);
      const histItems = parsed.map(p => ({
        id: uuidv4(),
        supplierId: p.supplierId,
        productName: p.product,
        model: p.model,
        capacity: p.capacity,
        condition: p.condition,
        priceBRL: p.priceBRL,
        dateRecorded: new Date().toISOString(),
      }));
      await saveHistoricalParsedProducts(histItems);
      setPriceListText('');
      await fetchHistoricalAndAggregate();
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Falha ao processar lista.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Limpar TODOS os dados de preços históricos? Esta ação não pode ser desfeita.')) {
      await deleteAllHistoricalProductsForUser();
      await fetchHistoricalAndAggregate();
    }
  };

  const aggregatedColumns = useMemo(() => [
    { header: 'Produto', accessor: (i: AggregatedProductPrice): ReactNode => `${i.productName} ${i.model}` },
    { header: 'Capacidade', accessor: 'capacity' as keyof AggregatedProductPrice },
    { header: 'Condição', accessor: 'condition' as keyof AggregatedProductPrice },
    { header: 'Mínimo (R$)', accessor: (i: AggregatedProductPrice): ReactNode => formatCurrencyBRL(i.minPriceBRL), className: 'font-semibold text-green-600' },
    { header: 'Fornecedor +Barato', accessor: 'cheapestSupplierName' as keyof AggregatedProductPrice },
    { header: 'Preço Médio', accessor: (i: AggregatedProductPrice): ReactNode => formatCurrencyBRL(i.avgPriceBRL) },
    { header: 'Ver Histórico', accessor: (i: AggregatedProductPrice): ReactNode => (<Button size="sm" variant="link" onClick={e => {e.stopPropagation();setSelectedProduct(i);}}>Ver</Button>) },
    ...(profitMargin > 0 ? [{
      header: `Venda (${profitMargin}%)`,
      accessor: (i: AggregatedProductPrice): ReactNode => formatCurrencyBRL(i.minPriceBRL * (1 + profitMargin / 100)),
      className: 'font-bold text-blue-700'
    }] : [])
  ], [profitMargin]);

  const buildChartData = (product: AggregatedProductPrice) => {
    const filtered = historicalData.filter(h =>
      h.productName === product.productName &&
      h.model === product.model &&
      h.capacity === product.capacity &&
      h.condition === product.condition
    );
    const dateMap: Record<string, any> = {};
    filtered.forEach(item => {
      const date = item.dateRecorded.split('T')[0];
      const supplier = suppliers.find(s => s.id === item.supplierId)?.name || item.supplierId;
      if (!dateMap[date]) dateMap[date] = { date };
      dateMap[date][supplier] = item.priceBRL;
    });
    return Object.values(dateMap).sort((a,b) => a.date.localeCompare(b.date));
  };

  const chartLines = (product: AggregatedProductPrice) => {
    const suppliersSet = new Set<string>();
    historicalData.forEach(h => {
      if (
        h.productName === product.productName &&
        h.model === product.model &&
        h.capacity === product.capacity &&
        h.condition === product.condition
      ) {
        suppliersSet.add(suppliers.find(s => s.id === h.supplierId)?.name || h.supplierId);
      }
    });
    const colors = ['#8884d8', '#82ca9d', '#ff7300', '#e6194B', '#4363d8', '#f58231'];
    return Array.from(suppliersSet).map((name, idx) => (
      <Line key={name} type="monotone" dataKey={name} stroke={colors[idx % colors.length]} />
    ));
  };

  return (
    <div>
      <PageTitle title="Análise de Mercado" subtitle="Compare preços e tendências." />
      {processingError && <Alert type="error" message={processingError} onClose={() => setProcessingError(null)} className="mb-4" />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="1. Adicionar Lista de Preços" className="lg:col-span-1">
          <div className="space-y-4">
            <Select
              label="Selecione o Fornecedor"
              id="supplier"
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              options={supplierOptions}
              required
            />
            <Textarea label="Cole a Lista de Preços" id="priceList" value={priceListText} onChange={e => setPriceListText(e.target.value)} rows={10} required />
            <Button onClick={handleProcessList} isLoading={isProcessing} disabled={isProcessing || !isGeminiAvailable()} fullWidth>
              {isProcessing ? 'Processando...' : 'Processar Lista'}
            </Button>
            {!isGeminiAvailable() && <p className="text-xs text-red-500 text-center">API Key não configurada.</p>}
          </div>
        </Card>
        <Card title="2. Visão Geral de Preços" className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <Input label="Margem de Lucro (%)" id="profit" type="number" value={String(profitMargin)} onChange={e => setProfitMargin(parseFloat(e.target.value) || 0)} className="max-w-xs" inputClassName="h-10" />
            <div className="flex space-x-2 flex-wrap">
              <Button variant="danger" size="sm" onClick={handleClearAll}>Limpar Dados</Button>
            </div>
          </div>
          <ResponsiveTable
            columns={aggregatedColumns}
            data={aggregatedData}
            isLoading={false}
            rowKeyAccessor="key"
            emptyStateMessage="Nenhum dado processado ainda."
          />
        </Card>
      </div>
      {selectedProduct && (
        <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title={`Histórico: ${selectedProduct.productName} ${selectedProduct.model} ${selectedProduct.capacity} (${selectedProduct.condition})`} size="xl">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buildChartData(selectedProduct)}>
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatCurrencyBRL} />
                <Tooltip formatter={(v: number) => formatCurrencyBRL(v)} />
                <Legend />
                {chartLines(selectedProduct)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setSelectedProduct(null)}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MarketAnalysisPage;
