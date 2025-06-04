
import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { Order, OrderCostItem, CostType, OrderStatus, COST_TYPE_OPTIONS, WeeklySummaryStats, Client } from '../types';
import { getOrders, getOrderCostsByOrderId, getClientById, formatCurrencyBRL, formatDateBR, deleteOrderCostItem, getAllOrderCosts, getWeeklySummaryStats } from '../services/AppService';
import { PageTitle, Card, ResponsiveTable, Spinner, Button, Select as SharedSelect, Alert, Tabs, Tab } from '../components/SharedComponents';
import { useNavigate } from 'react-router-dom';

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);


const ReportByOrderTab: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrderCosts, setSelectedOrderCosts] = useState<OrderCostItem[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [isLoadingCosts, setIsLoadingCosts] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [clientCache, setClientCache] = useState<Record<string, Client | null>>({});


    useEffect(() => {
        const fetchInitialOrders = async () => {
            setIsLoadingOrders(true);
            setError(null);
            try {
                const fetchedOrders = await getOrders();
                setOrders(fetchedOrders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
            } catch (e) {
                setError("Falha ao carregar encomendas.");
                console.error(e);
            } finally {
                setIsLoadingOrders(false);
            }
        };
        fetchInitialOrders();
    }, []);

    useEffect(() => {
        const fetchOrderCosts = async () => {
            if (selectedOrderId) {
                setIsLoadingCosts(true);
                setError(null);
                try {
                    const costs = await getOrderCostsByOrderId(selectedOrderId);
                    setSelectedOrderCosts(costs);
                } catch (e) {
                    setError("Falha ao carregar custos da encomenda.");
                    console.error(e);
                } finally {
                    setIsLoadingCosts(false);
                }
            } else {
                setSelectedOrderCosts([]);
            }
        };
        fetchOrderCosts();
    }, [selectedOrderId]);
    
    const selectedOrder = useMemo(() => {
        return orders.find(o => o.id === selectedOrderId);
    }, [orders, selectedOrderId]);

    // Cache client details
    useEffect(() => {
        const fetchClientDetailsForOrders = async () => {
            const newClientCache = {...clientCache};
            let cacheUpdated = false;
            for (const order of orders) {
                if (order.clientId && !newClientCache[order.clientId]) {
                    try {
                        newClientCache[order.clientId] = await getClientById(order.clientId) || null;
                        cacheUpdated = true;
                    } catch (e) {
                        console.error(`Failed to fetch client ${order.clientId}`, e);
                        newClientCache[order.clientId] = null; // Mark as fetched (even if failed)
                        cacheUpdated = true;
                    }
                }
            }
            if (cacheUpdated) {
                setClientCache(newClientCache);
            }
        };
        if(orders.length > 0) {
            fetchClientDetailsForOrders();
        }
    }, [orders]); // Only re-run if orders change, clientCache itself is not a dependency here

    const getCachedClientName = (clientId?: string): string => {
        if (!clientId) return 'Cliente Manual';
        const client = clientCache[clientId];
        return client?.fullName || 'Carregando Cliente...';
    };


    const totalOtherCostsForSelectedOrder = useMemo(() => { 
        return selectedOrderCosts.filter(cost => cost.type !== CostType.COMPRA_FORNECEDOR)
                                 .reduce((sum, item) => sum + item.amount, 0);
    }, [selectedOrderCosts]);

    const totalCostsForSelectedOrder = useMemo(() => {
        if (!selectedOrder) return 0;
        return (selectedOrder.purchasePrice || 0) + totalOtherCostsForSelectedOrder;
    }, [selectedOrder, totalOtherCostsForSelectedOrder]);


    const netProfitForSelectedOrder = useMemo(() => { 
        if (!selectedOrder || selectedOrder.sellingPrice === undefined || selectedOrder.sellingPrice === null) {
            return null; 
        }
        return selectedOrder.sellingPrice - totalCostsForSelectedOrder;
    }, [selectedOrder, totalCostsForSelectedOrder]);

    const orderOptions = [{ value: '', label: 'Selecione uma Encomenda...' }, ...orders.map(o => {
        const customerName = o.clientId ? getCachedClientName(o.clientId) : o.customerName;
        return { value: o.id, label: `${o.productName} ${o.model} (${customerName}) - Pedido: ${formatDateBR(o.orderDate)}` };
    })];

    const handleDeleteCost = async (costItemId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este item de custo?")) {
            try {
                await deleteOrderCostItem(costItemId);
                if (selectedOrderId) { 
                    const updatedCosts = await getOrderCostsByOrderId(selectedOrderId);
                    setSelectedOrderCosts(updatedCosts);
                }
            } catch (e) {
                setError("Falha ao excluir item de custo.");
                console.error(e);
            }
        }
    };

    const costTableColumns = [
        { header: 'Data', accessor: (item: OrderCostItem): ReactNode => formatDateBR(item.date) },
        { header: 'Tipo de Custo', accessor: 'type' as keyof OrderCostItem },
        { header: 'Descrição', accessor: 'description' as keyof OrderCostItem, cellClassName: "whitespace-pre-wrap break-words max-w-xs" },
        { header: 'Valor (R$)', accessor: (item: OrderCostItem): ReactNode => formatCurrencyBRL(item.amount), cellClassName: "text-right font-medium" },
        { header: 'Ações', accessor: (item: OrderCostItem): ReactNode => (
             item.type !== CostType.COMPRA_FORNECEDOR ? 
            <Button 
                variant="danger" 
                size="sm" 
                onClick={async (e) => { e.stopPropagation(); await handleDeleteCost(item.id); }}
                title="Excluir Custo"
            >
                <i className="heroicons-outline-trash h-4 w-4"></i>
            </Button> : <span className="text-xs text-gray-400">Custo Fixo</span>
          )},
    ];
    
    const displayCosts = useMemo(() => {
        if (!selectedOrder) return [];
        const allDisplayCosts: OrderCostItem[] = [];
        if (selectedOrder.purchasePrice !== undefined && selectedOrder.purchasePrice > 0) {
            allDisplayCosts.push({
                id: `purchase-${selectedOrder.id}`,
                orderId: selectedOrder.id,
                type: CostType.COMPRA_FORNECEDOR,
                description: 'Valor de compra do produto',
                amount: selectedOrder.purchasePrice,
                date: selectedOrder.orderDate 
            });
        }
        selectedOrderCosts
            .filter(cost => cost.type !== CostType.COMPRA_FORNECEDOR)
            .forEach(cost => allDisplayCosts.push(cost));
            
        return allDisplayCosts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedOrder, selectedOrderCosts]);


    return (
      <div className="mt-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
        <Card className="mb-6">
            <SharedSelect
                id="selectOrderForReport"
                label="Selecione uma Encomenda para Análise Detalhada"
                options={orderOptions}
                value={selectedOrderId || ''}
                onChange={(e) => setSelectedOrderId(e.target.value || null)}
                disabled={isLoadingOrders}
            />
            {isLoadingOrders && <div className="p-4 text-center"><Spinner /> Carregando encomendas...</div>}
        </Card>

        {selectedOrderId && selectedOrder && (
            <Card title={`Relatório Financeiro: ${selectedOrder.productName} ${selectedOrder.model} (${selectedOrder.clientId ? getCachedClientName(selectedOrder.clientId) : selectedOrder.customerName})`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="text-sm text-gray-600">Preço de Venda (Cliente)</p>
                        <p className="text-xl font-semibold text-green-600">{formatCurrencyBRL(selectedOrder.sellingPrice)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Custo Total dos Produtos</p>
                        <p className="text-lg font-medium text-red-600">{formatCurrencyBRL(selectedOrder.purchasePrice)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total de Outros Custos</p>
                        <p className="text-lg font-medium text-red-500">{formatCurrencyBRL(totalOtherCostsForSelectedOrder)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-600">Lucro Líquido Estimado</p>
                        <p className={`text-xl font-bold ${netProfitForSelectedOrder === null ? 'text-gray-500' : (netProfitForSelectedOrder >= 0 ? 'text-green-700' : 'text-red-700')}`}>
                            {netProfitForSelectedOrder === null ? 'N/A (Venda não definida)' : formatCurrencyBRL(netProfitForSelectedOrder)}
                        </p>
                    </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Detalhes dos Custos Lançados</h3>
                {isLoadingCosts ? (
                    <div className="p-4 text-center"><Spinner /> Carregando custos...</div>
                ) : (
                    <ResponsiveTable
                        columns={costTableColumns}
                        data={displayCosts}
                        rowKeyAccessor="id"
                        emptyStateMessage="Nenhum custo lançado para esta encomenda (além do preço de compra, se houver)."
                    />
                )}
                <div className="mt-6">
                    <Button onClick={() => navigate(`/orders?viewOrderId=${selectedOrderId}`)} variant="secondary">
                        Ver Detalhes da Encomenda
                    </Button>
                </div>
            </Card>
        )}
        {!selectedOrderId && !isLoadingOrders && (
            <Card>
                <p className="text-center text-gray-500 py-10">Selecione uma encomenda acima para ver seu relatório financeiro detalhado.</p>
            </Card>
        )}
      </div>
    );
};


const MonthlySummaryTab: React.FC = () => {
    const [currentMonthOffset, setCurrentMonthOffset] = useState(0); 
    const [monthlyData, setMonthlyData] = useState<{
        revenue: number;
        totalCosts: number;
        profit: number;
        costsByType: Record<CostType, number>;
        monthLabel: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null); 

    useEffect(() => {
        const fetchMonthlySummary = async () => {
            setIsLoading(true);
            setError(null); 
            try {
                const today = new Date();
                const targetMonthDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1);
                
                if (isNaN(targetMonthDate.getTime())) {
                    console.error("Invalid targetMonthDate in MonthlySummaryTab", { currentMonthOffset });
                    throw new Error("Erro ao calcular data para resumo mensal.");
                }

                const year = targetMonthDate.getFullYear();
                const month = targetMonthDate.getMonth(); 

                const firstDayOfMonth = new Date(year, month, 1);
                if (isNaN(firstDayOfMonth.getTime())) {
                     console.error("Invalid firstDayOfMonth in MonthlySummaryTab", { year, month });
                    throw new Error("Erro ao calcular início do mês para resumo.");
                }
                
                const lastDayOfMonth = new Date(year, month + 1, 0);
                lastDayOfMonth.setHours(23, 59, 59, 999); 

                const allOrders = await getOrders();
                const allCosts = await getAllOrderCosts();

                let revenue = 0;
                let totalCosts = 0;
                const costsByType = Object.fromEntries(COST_TYPE_OPTIONS.map(type => [type, 0])) as Record<CostType, number>;
                
                allOrders.forEach(order => {
                    const deliveryEntry = order.trackingHistory.find(h => h.status === OrderStatus.ENTREGUE);
                    if (deliveryEntry && deliveryEntry.date) { // Ensure date exists
                        const deliveryDate = new Date(deliveryEntry.date);
                        if (deliveryDate >= firstDayOfMonth && deliveryDate <= lastDayOfMonth) {
                            revenue += order.sellingPrice || 0;
                        }
                    }
                });

                allCosts.forEach(cost => {
                    const costDate = new Date(cost.date);
                    if (costDate >= firstDayOfMonth && costDate <= lastDayOfMonth) {
                        totalCosts += cost.amount;
                        costsByType[cost.type] = (costsByType[cost.type] || 0) + cost.amount;
                    }
                });
                
                const monthLabelText = firstDayOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                setMonthlyData({
                    revenue,
                    totalCosts,
                    profit: revenue - totalCosts,
                    costsByType,
                    monthLabel: monthLabelText
                });
            } catch (e) {
                console.error(e);
                setError(e instanceof Error ? e.message : "Erro ao carregar resumo mensal.");
                setMonthlyData(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMonthlySummary();
    }, [currentMonthOffset]);

    const changeMonth = (offsetChange: number) => {
        const newOffset = currentMonthOffset + offsetChange;
        const today = new Date();
        const firstOfNewOffsetMonth = new Date(today.getFullYear(), today.getMonth() + newOffset, 1);
        
        if (newOffset > 0 && (firstOfNewOffsetMonth.getFullYear() > today.getFullYear() || 
            (firstOfNewOffsetMonth.getFullYear() === today.getFullYear() && firstOfNewOffsetMonth.getMonth() > today.getMonth()))) {
            return; // Do not navigate to future months
        }
        setCurrentMonthOffset(newOffset);
    };
    
    const isNextMonthDisabled = () => {
        const today = new Date();
        const firstOfNextPotentialMonth = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset + 1, 1);
        return firstOfNextPotentialMonth.getFullYear() > today.getFullYear() || 
               (firstOfNextPotentialMonth.getFullYear() === today.getFullYear() && firstOfNextPotentialMonth.getMonth() > today.getMonth());
    };


    if (isLoading) {
        return <div className="flex justify-center items-center p-10"><Spinner /> Carregando resumo mensal...</div>;
    }
    if (error) { 
        return <Alert type="error" message={error} onClose={() => setError(null)} />;
    }
    if (!monthlyData) {
        return <p className="text-center text-gray-500 py-10">Não foi possível carregar os dados mensais.</p>;
    }

    const profitClass = monthlyData.profit >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="mt-6">
            <Card>
                 <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-t-lg">
                    <Button onClick={() => changeMonth(-1)} variant="ghost" leftIcon={<ChevronLeftIcon className="h-5 w-5"/>}>Mês Anterior</Button>
                    <h3 className="text-xl font-semibold text-gray-800 text-center">{monthlyData.monthLabel.toLocaleUpperCase()}</h3>
                    <Button onClick={() => changeMonth(1)} variant="ghost" rightIcon={<ChevronRightIcon className="h-5 w-5"/>} disabled={isNextMonthDisabled()}>Próximo Mês</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                    <div className={`p-4 rounded-lg shadow text-center ${monthlyData.revenue > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <h4 className="text-sm font-medium text-gray-500">RECEITA TOTAL</h4>
                        <p className="text-3xl font-bold text-green-600">{formatCurrencyBRL(monthlyData.revenue)}</p>
                    </div>
                    <div className={`p-4 rounded-lg shadow text-center ${monthlyData.totalCosts > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <h4 className="text-sm font-medium text-gray-500">CUSTOS TOTAIS</h4>
                        <p className="text-3xl font-bold text-red-600">{formatCurrencyBRL(monthlyData.totalCosts)}</p>
                    </div>
                    <div className={`p-4 rounded-lg shadow text-center ${monthlyData.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        <h4 className="text-sm font-medium text-gray-500">LUCRO LÍQUIDO</h4>
                        <p className={`text-3xl font-bold ${profitClass}`}>{formatCurrencyBRL(monthlyData.profit)}</p>
                    </div>
                </div>

                <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-3">Detalhamento dos Custos do Mês:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(monthlyData.costsByType)
                            .filter(([, amount]) => amount > 0) 
                            .sort(([,aAmount], [,bAmount]) => bAmount - aAmount) 
                            .map(([type, amount]) => (
                            <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded shadow-sm">
                                <span className="text-sm text-gray-600">{type as CostType}:</span>
                                <span className="text-sm font-medium text-red-500">{formatCurrencyBRL(amount)}</span>
                            </div>
                        ))}
                         {Object.values(monthlyData.costsByType).every(amount => amount === 0) && (
                            <p className="text-sm text-gray-500 md:col-span-2 text-center py-4">Nenhum custo detalhado lançado para este mês.</p>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

const WeeklySummaryTab: React.FC = () => {
    const [weekOffset, setWeekOffset] = useState(0); 
    const [summaryStats, setSummaryStats] = useState<WeeklySummaryStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeeklyData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const stats = await getWeeklySummaryStats(weekOffset);
                setSummaryStats(stats);
            } catch (e) {
                console.error("Error fetching weekly summary:", e);
                setError("Falha ao carregar resumo semanal.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchWeeklyData();
    }, [weekOffset]);

    const handlePreviousWeek = () => setWeekOffset(prev => prev + 1); 
    const handleNextWeek = () => setWeekOffset(prev => Math.max(0, prev - 1)); 

    const StatDisplayCard: React.FC<{ title: string; value: string | number; description?: string; valueClass?: string }> = 
        ({ title, value, description, valueClass = "text-blue-600" }) => (
        <Card className="text-center shadow-md hover:shadow-lg transition-shadow h-full flex flex-col justify-between">
            <div>
                <h3 className="text-base font-semibold text-gray-700">{title.toLocaleUpperCase()}</h3>
                <p className={`text-3xl font-bold my-1 ${valueClass}`}>{value}</p>
            </div>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </Card>
    );
    
    const currentWeekLabel = useMemo(() => {
        if (!summaryStats) return "";
        return `Semana: ${formatDateBR(summaryStats.startDate)} - ${formatDateBR(summaryStats.endDate)}`;
    }, [summaryStats]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-10"><Spinner size="lg" /><p className="ml-3 text-gray-600">Carregando resumo semanal...</p></div>
        );
    }
    if (error) return <Alert type="error" message={error} onClose={() => setError(null)} />;
    if (!summaryStats) return <p className="text-center text-gray-500 py-10">Nenhum dado disponível.</p>;

    return (
        <div className="mt-6">
            <Card>
                <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-t-lg">
                    <Button onClick={handlePreviousWeek} variant="ghost" leftIcon={<ChevronLeftIcon className="h-5 w-5"/>}>Semana Anterior</Button>
                    <h3 className="text-xl font-semibold text-gray-800 text-center">{currentWeekLabel}</h3>
                    <Button onClick={handleNextWeek} variant="ghost" rightIcon={<ChevronRightIcon className="h-5 w-5"/>} disabled={weekOffset === 0}>Próxima Semana</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    <StatDisplayCard title="Encomendas Chegaram" value={summaryStats.ordersArrived} valueClass="text-green-600" description="Produtos que chegaram na Blu."/>
                    <StatDisplayCard title="Encomendas Entregues" value={summaryStats.ordersDelivered} valueClass="text-teal-600" description="Produtos entregues aos clientes."/>
                    <StatDisplayCard title="Novos Contratos BluFacilita" value={summaryStats.newBluFacilitaContracts} valueClass="text-indigo-600" description="Vendas parceladas pela BluFacilita."/>
                    <StatDisplayCard title="Pago a Fornecedores" value={formatCurrencyBRL(summaryStats.totalAmountPaidToSuppliers)} valueClass="text-red-500" description="Custo de compra de produtos (aprox.)."/>
                    <StatDisplayCard title="Recebido de Clientes" value={formatCurrencyBRL(summaryStats.totalAmountReceivedFromClients)} valueClass="text-lime-600" description="Valor de venda de produtos entregues."/>
                    <StatDisplayCard title="Valor Financiado (BluFacilita)" value={formatCurrencyBRL(summaryStats.totalBluFacilitaFinanced)} valueClass="text-purple-600" description="Total financiado em novos contratos."/>
                </div>
            </Card>
        </div>
    );
};


export const FinancialReportsPageContainer: React.FC<{}> = () => { 
    const [activeTab, setActiveTab] = useState<'byOrder' | 'monthlySummary' | 'weeklySummary'>('byOrder');

    return (
        <div>
            <PageTitle title="Relatórios Blu Imports" subtitle="Analise custos, lucratividade e operações semanais/mensais." />
            <Tabs className="mb-0"> 
                <Tab label="Financeiro por Encomenda" isActive={activeTab === 'byOrder'} onClick={() => setActiveTab('byOrder')} />
                <Tab label="Resumo Mensal" isActive={activeTab === 'monthlySummary'} onClick={() => setActiveTab('monthlySummary')} />
                <Tab label="Resumo Semanal" isActive={activeTab === 'weeklySummary'} onClick={() => setActiveTab('weeklySummary')} />
            </Tabs>

            {activeTab === 'byOrder' && <ReportByOrderTab />}
            {activeTab === 'monthlySummary' && <MonthlySummaryTab />}
            {activeTab === 'weeklySummary' && <WeeklySummaryTab />}
        </div>
    );
};