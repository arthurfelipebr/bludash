import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AggregatedProductPrice, Supplier, HistoricalParsedProduct } from '../types';
import { 
  parseSupplierListWithGemini, 
  aggregateSupplierData,
  formatCurrencyBRL, exportToCSV,
  getSuppliers, saveSupplier, deleteSupplier, getSupplierById,
  isGeminiAvailable,
  formatDateBR,
  saveHistoricalParsedProducts, // For saving new parsed data
  getHistoricalParsedProducts,  // For fetching all data for aggregation
  deleteAllHistoricalProductsForUser, // For clearing data
  normalizeProductCondition
} from '../services/AppService';
import { Button, Textarea, Card, PageTitle, Alert, ResponsiveTable, Input, Modal, Select, Tabs, Tab } from '../components/SharedComponents';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { v4 as uuidv4 } from 'uuid';

// --- Supplier Form Component ---
const initialSupplierFormData: Omit<Supplier, 'id' | 'registrationDate' | 'priceListsHistory'> = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  notes: '',
};

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  initialSupplier?: Supplier | null;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ isOpen, onClose, onSave, initialSupplier }) => {
  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'registrationDate' | 'priceListsHistory'>>(initialSupplierFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (initialSupplier) {
      setFormData({
        name: initialSupplier.name,
        contactPerson: initialSupplier.contactPerson || '',
        phone: initialSupplier.phone,
        email: initialSupplier.email || '',
        notes: initialSupplier.notes || '',
      });
    } else {
      setFormData(initialSupplierFormData);
    }
  }, [initialSupplier, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name || !formData.phone) {
        setError("Nome do Fornecedor e Telefone são obrigatórios.");
        return;
    }
    setIsLoading(true);
    const supplierToSave: Supplier = {
      ...formData,
      id: initialSupplier?.id || uuidv4(),
      registrationDate: initialSupplier?.registrationDate || new Date().toISOString(),
      priceListsHistory: initialSupplier?.priceListsHistory || [], // Preserve existing history
    };
    try {
      await onSave(supplierToSave); 
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar fornecedor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialSupplier ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        <Input label="Nome do Fornecedor" id="name" name="name" value={formData.name} onChange={handleChange} required />
        <Input label="Telefone (para WhatsApp)" id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required placeholder="Ex: 5511999998888" />
        <Input label="Pessoa de Contato (Opcional)" id="contactPerson" name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} />
        <Input label="E-mail (Opcional)" id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
        <Textarea label="Observações (Opcional)" id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {initialSupplier ? 'Salvar Alterações' : 'Adicionar Fornecedor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};


// --- Manage Suppliers Tab ---
interface ManageSuppliersTabProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
  isLoading: boolean;
}
const ManageSuppliersTab: React.FC<ManageSuppliersTabProps> = ({ suppliers, onEdit, onDelete, isLoading }) => {
  const columns = [
    { header: 'Nome', accessor: 'name' as keyof Supplier, className: 'font-medium' },
    { header: 'Telefone', accessor: 'phone' as keyof Supplier },
    { header: 'Contato', accessor: 'contactPerson' as keyof Supplier },
    { header: 'Email', accessor: 'email' as keyof Supplier },
    { header: 'Cadastrado em', accessor: (item: Supplier): ReactNode => formatDateBR(item.registrationDate) },
    { header: 'Ações', accessor: (item: Supplier): ReactNode => (
      <div className="space-x-1">
        <Button variant="ghost" size="sm" onClick={(e) => {e.stopPropagation(); onEdit(item);}} title="Editar"><i className="heroicons-outline-pencil-square h-4 w-4"></i></Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={(e) => {e.stopPropagation(); onDelete(item.id);}} title="Excluir"><i className="heroicons-outline-trash h-4 w-4"></i></Button>
      </div>
    )},
  ];
  return (
    <Card>
        <ResponsiveTable columns={columns} data={suppliers} isLoading={isLoading} rowKeyAccessor="id" emptyStateMessage="Nenhum fornecedor cadastrado."/>
    </Card>
  );
};


// --- Analyze Prices Tab ---
interface AnalyzePricesTabProps {
    suppliers: Supplier[];
    aggregatedData: AggregatedProductPrice[];
    historicalData: HistoricalParsedProduct[];
    onProcessList: (textList: string, supplier: Supplier) => Promise<void>;
    onClearAllParsedData: () => Promise<void>;
    onExportAggregated: (profitMargin: number) => void;
    onExportRaw: () => void; // Will export historical data
    isLoadingRawData: boolean;
}
const AnalyzePricesTab: React.FC<AnalyzePricesTabProps> = ({
    suppliers, aggregatedData, historicalData, onProcessList, onClearAllParsedData, onExportAggregated, onExportRaw, isLoadingRawData
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [priceListText, setPriceListText] = useState<string>('');
  const [isLoadingProcessing, setIsLoadingProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [profitMargin, setProfitMargin] = useState<number>(0);
  const [selectedProduct, setSelectedProduct] = useState<AggregatedProductPrice | null>(null);

  const supplierOptions = useMemo(() => [
      { value: '', label: 'Selecione um Fornecedor...' },
      ...suppliers.map(s => ({ value: s.id, label: s.name }))
    ], [suppliers]);

  const handleProcessListInternal = async () => {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!selectedSupplier) {
      setProcessingError("Por favor, selecione um fornecedor cadastrado.");
      return;
    }
    if (!priceListText.trim()) {
      setProcessingError("A lista de preços não pode estar vazia.");
      return;
    }
    if (!isGeminiAvailable()) {
        setProcessingError("Serviço de IA (Gemini) não está disponível. Verifique a configuração da API Key.");
        return;
    }
    
    setIsLoadingProcessing(true);
    setProcessingError(null);
    try {
      await onProcessList(priceListText, selectedSupplier);
      setPriceListText(''); 
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido ao processar a lista.");
    } finally {
      setIsLoadingProcessing(false);
    }
  };
  
  const aggregatedColumns = useMemo(() => [
    { header: 'Produto', accessor: (item: AggregatedProductPrice): ReactNode => `${item.productName} ${item.model}`, className: 'font-medium' },
    { header: 'Capacidade', accessor: 'capacity' as keyof AggregatedProductPrice },
    { header: 'Cor', accessor: 'color' as keyof AggregatedProductPrice },
    { header: 'Características', accessor: 'characteristics' as keyof AggregatedProductPrice },
    { header: 'País', accessor: 'country' as keyof AggregatedProductPrice },
    { header: 'Condição', accessor: 'condition' as keyof AggregatedProductPrice },
    { header: 'Média (R$)', accessor: (item: AggregatedProductPrice): ReactNode => formatCurrencyBRL(item.avgPriceBRL) },
    { header: 'Menor Preço (R$)', accessor: (item: AggregatedProductPrice): ReactNode => formatCurrencyBRL(item.minPriceBRL), className: 'font-semibold text-green-600' },
    { header: 'Fornecedor +Barato', accessor: 'cheapestSupplierName' as keyof AggregatedProductPrice },
    { header: 'Qtd Fornec.', accessor: 'supplierCount' as keyof AggregatedProductPrice, className: 'text-center' },
    ...(profitMargin > 0 ? [{
        header: `Preço Venda (${profitMargin}%)`,
        accessor: (item: AggregatedProductPrice): ReactNode => formatCurrencyBRL(item.minPriceBRL * (1 + profitMargin / 100)),
        className: 'font-bold text-blue-700'
    }] : []),
    { header: 'Ver Histórico', accessor: (item: AggregatedProductPrice): ReactNode => ( <Button size="sm" variant="link" onClick={(e) => { e.stopPropagation(); setSelectedProduct(item); }}>Ver</Button> )}
  ], [profitMargin]);

  const buildChartData = (product: AggregatedProductPrice) => {
    const filtered = historicalData.filter(h =>
      h.productName === product.productName &&
      h.model === product.model &&
      h.capacity === product.capacity &&
      h.color === product.color &&
      h.country === product.country &&
      normalizeProductCondition(h.condition) === product.condition
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
        h.color === product.color &&
        h.country === product.country &&
        normalizeProductCondition(h.condition) === product.condition
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
    <>
    {processingError && <Alert type="error" message={processingError} onClose={() => setProcessingError(null)} className="mb-4" />}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="1. Adicionar Lista de Preços" className="lg:col-span-1">
          <form onSubmit={(e) => { e.preventDefault(); handleProcessListInternal();}} className="space-y-4">
            <Select 
              label="Selecione o Fornecedor" 
              id="selectedSupplierId" 
              value={selectedSupplierId} 
              onChange={(e) => setSelectedSupplierId(e.target.value)} 
              options={supplierOptions}
              required
            />
            <Textarea label="Cole a Lista de Preços Aqui" id="priceListText" value={priceListText} onChange={(e) => setPriceListText(e.target.value)} rows={10} placeholder="iPhone 15 Pro Max 256GB Lacrado R$7500..." required />
            <Button type="submit" isLoading={isLoadingProcessing} disabled={isLoadingProcessing || !isGeminiAvailable()} fullWidth>
              {isLoadingProcessing ? 'Processando com IA...' : 'Processar Lista'}
            </Button>
            {!isGeminiAvailable() && <p className="text-xs text-red-500 text-center mt-2">API Key não configurada ou falha na inicialização do Gemini.</p>}
          </form>
        </Card>

        <Card title="2. Tabela Comparativa de Preços" className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <Input label="Margem de Lucro (%)" id="profitMargin" type="number" value={String(profitMargin)} onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)} placeholder="Ex: 10" className="max-w-xs" inputClassName="h-10" />
                 <div className="flex space-x-2 flex-wrap">
                    <Button onClick={() => onExportAggregated(profitMargin)} variant="secondary" size="sm" leftIcon={<i className="heroicons-outline-arrow-down-tray h-4 w-4"></i>}>Exportar Análise</Button>
                    <Button onClick={onExportRaw} variant="ghost" size="sm" leftIcon={<i className="heroicons-outline-arrow-down-tray h-4 w-4"></i>}>Exportar Dados Históricos</Button>
                 </div>
            </div>
            <ResponsiveTable columns={aggregatedColumns} data={aggregatedData} isLoading={isLoadingRawData && aggregatedData.length === 0} emptyStateMessage="Nenhum dado de fornecedor processado ainda." rowKeyAccessor="key" />
            {aggregatedData.length > 0 && ( <div className="mt-6 text-right"> <Button variant="danger" onClick={onClearAllParsedData} size="sm"> Limpar Todos os Dados Processados </Button> </div> )}
        </Card>
    </div>
    {selectedProduct && (
        <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title={`Histórico: ${selectedProduct.productName} ${selectedProduct.model} ${selectedProduct.capacity} ${selectedProduct.color || ''} ${selectedProduct.characteristics || ''} ${selectedProduct.country || ''} (${selectedProduct.condition})`} size="xl">
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
            <div className="mt-4 flex justify-end"> <Button onClick={() => setSelectedProduct(null)}>Fechar</Button> </div>
        </Modal>
    )}
    </>
  );
};


// --- Main Suppliers Page Component ---
export const SuppliersPage: React.FC<{}> = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'manage'>('analyze');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [historicalProducts, setHistoricalProducts] = useState<HistoricalParsedProduct[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedProductPrice[]>([]);
  const [isLoadingAnalysisData, setIsLoadingAnalysisData] = useState(true);


  const fetchAllSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);
    try {
        setSuppliers(await getSuppliers());
    } catch (e) { console.error("Failed to fetch suppliers:", e); }
    setIsLoadingSuppliers(false);
  }, []);

  const fetchAllHistoricalDataAndAggregate = useCallback(async () => {
    setIsLoadingAnalysisData(true);
    try {
        const rawHistoricalData = await getHistoricalParsedProducts();
        setHistoricalProducts(rawHistoricalData);
        const aggData = await aggregateSupplierData(rawHistoricalData);
        setAggregatedData(aggData);
    } catch (e) { console.error("Failed to fetch/aggregate historical prices:", e); }
    setIsLoadingAnalysisData(false);
  }, []);


  useEffect(() => {
    fetchAllSuppliers();
    fetchAllHistoricalDataAndAggregate();
  }, [fetchAllSuppliers, fetchAllHistoricalDataAndAggregate]);

  const handleSaveSupplier = async (supplier: Supplier) => {
    if (editingSupplier) {
      await saveSupplier(supplier);
    } else {
      const { id, ...data } = supplier;
      await saveSupplier(data as Omit<Supplier, 'id'>);
    }
    await fetchAllSuppliers();
    setIsSupplierFormOpen(false);
    setEditingSupplier(null);
  };
  const handleEditSupplier = (supplier: Supplier) => { setEditingSupplier(supplier); setIsSupplierFormOpen(true); };
  const handleDeleteSupplier = async (supplierId: string) => { 
      if (window.confirm("Tem certeza? Excluir um fornecedor também removerá os dados de preços históricos associados a ele.")) { 
          await deleteSupplier(supplierId); // This now also deletes related historical prices
          await fetchAllSuppliers(); 
          await fetchAllHistoricalDataAndAggregate(); // Re-fetch and aggregate
      } 
  };

  const handleProcessList = async (textList: string, supplier: Supplier) => {
      const newParsedFromGemini = await parseSupplierListWithGemini(textList, supplier);
      if (newParsedFromGemini.length > 0) {
          const newHistorical: HistoricalParsedProduct[] = newParsedFromGemini.map(p => ({
              id: p.id, // UUID from Gemini parser
              supplierId: p.supplierId,
              productName: p.product,
              model: p.model,
              capacity: p.capacity,
              color: p.color,
              characteristics: p.characteristics,
              country: p.country,
              condition: p.condition,
              priceBRL: p.priceBRL,
              dateRecorded: new Date().toISOString(),
              // listId and userId can be added by saveHistoricalParsedProducts if needed or kept optional
          }));
          await saveHistoricalParsedProducts(newHistorical);
          await fetchAllHistoricalDataAndAggregate(); // Refresh data
      }
  };
  const handleClearAllParsedData = async () => { 
      if (window.confirm("Limpar TODOS os dados de preços históricos? Esta ação não pode ser desfeita.")) { 
          await deleteAllHistoricalProductsForUser();
          await fetchAllHistoricalDataAndAggregate(); // Refresh data
      } 
  };
  const handleExportAggregated = (profitMargin: number) => {
      const dataToExport = aggregatedData.map(item => ({
          Produto: item.productName,
          Modelo: item.model,
          Capacidade: item.capacity,
          Cor: item.color,
          Caracteristicas: item.characteristics,
          Pais: item.country,
          Condicao: item.condition,
          PrecoMedio_BRL: item.avgPriceBRL,
          MenorPreco_BRL: item.minPriceBRL,
          FornecedorMaisBarato: item.cheapestSupplierName,
          QtdFornecedores: item.supplierCount,
          PrecoComMargem_BRL: profitMargin > 0 ? parseFloat((item.minPriceBRL * (1 + profitMargin / 100)).toFixed(2)) : item.minPriceBRL,
      }));
      exportToCSV(dataToExport, `analise_fornecedores_${new Date().toISOString().split('T')[0]}.csv`);
  };
  
  const handleExportRaw = () => { 
      const dataToExport = historicalProducts.map(item => ({
          ID_Historico: item.id,
          ID_Fornecedor: item.supplierId,
          Produto: item.productName,
          Modelo: item.model,
          Capacidade: item.capacity,
          Cor: item.color,
          Caracteristicas: item.characteristics,
          Pais: item.country,
          Condicao: item.condition,
          Preco_BRL: item.priceBRL,
          DataRegistro: formatDateBR(item.dateRecorded, true),
          ID_Lista: item.listId || "N/A"
      }));
      exportToCSV(dataToExport, `dados_historicos_precos_${new Date().toISOString().split('T')[0]}.csv`); 
  };


  return (
    <div>
      <PageTitle title="Fornecedores e Análise de Preços" subtitle="Gerencie fornecedores e compare listas de preços." 
        actions={activeTab === 'manage' ? <Button onClick={() => setIsSupplierFormOpen(true)} leftIcon={<i className="heroicons-outline-plus-circle h-5 w-5"></i>}>Novo Fornecedor</Button> : null}
      />
      
      <Tabs className="mb-6">
          <Tab label="Análise de Preços" isActive={activeTab === 'analyze'} onClick={() => setActiveTab('analyze')} />
          <Tab label="Gerenciar Fornecedores" isActive={activeTab === 'manage'} onClick={() => setActiveTab('manage')} count={suppliers.length}/>
      </Tabs>

      {activeTab === 'analyze' && (
        <AnalyzePricesTab
            suppliers={suppliers}
            aggregatedData={aggregatedData}
            historicalData={historicalProducts}
            onProcessList={handleProcessList}
            onClearAllParsedData={handleClearAllParsedData}
            onExportAggregated={handleExportAggregated}
            onExportRaw={handleExportRaw}
            isLoadingRawData={isLoadingAnalysisData}
        />
      )}
      {activeTab === 'manage' && (
        <ManageSuppliersTab 
            suppliers={suppliers}
            onEdit={handleEditSupplier}
            onDelete={handleDeleteSupplier}
            isLoading={isLoadingSuppliers}
        />
      )}

      {isSupplierFormOpen && (
        <SupplierForm
          isOpen={isSupplierFormOpen}
          onClose={() => { setIsSupplierFormOpen(false); setEditingSupplier(null); }}
          onSave={handleSaveSupplier}
          initialSupplier={editingSupplier}
        />
      )}
    </div>
  );
};