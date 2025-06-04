import React, { useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTitle, Card, Input, Select, Button, ResponsiveTable, Tabs, Tab, Alert, Modal, Spinner, ClipboardDocumentIcon } from '../components/SharedComponents'; 
import { 
  formatCurrencyBRL, 
  parseBRLCurrencyStringToNumber,
  formatNumberToBRLCurrencyInput,
  getOrders,
  getClients, 
  getClientById,
  saveOrder, 
  formatDateBR,
  DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE,
} from '../services/AppService';
import { Order, PaymentMethod, BluFacilitaContractStatus, BLU_FACILITA_CONTRACT_STATUS_OPTIONS, Client, BluFacilitaInstallment, ClientPayment } from '../types';
import { RegisterPaymentModal } from '../App'; 


interface SimulationResult {
  productValue: number;
  downPayment: number;
  financedAmount: number;
  numberOfInstallments: number;
  totalInterest: number;
  totalPaidOnFinancing: number; 
  grandTotalPaid: number; 
  monthlyPayment: number;
  monthlyInterestRatePercent: number;
  annualInterestRateUsed: number; 
  installmentsTable: Array<{ installmentNumber: number; value: number }>;
}

const PrintIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /> </svg> );
const LockClosedIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /> </svg> );
const LockOpenIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m.75 11.25H18A2.25 2.25 0 0020.25 18v-6.75A2.25 2.25 0 0018 9H6.75A2.25 2.25 0 004.5 11.25v6.75A2.25 2.25 0 006.75 21H9M10.5 10.5V6.75" /> </svg> );
const CreditCardPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25v-2.25m0 0V9.75m0 2.25H9.75m2.25 0h2.25" />
    </svg>
);


const SimulationTab: React.FC = () => {
  const [productValueInput, setProductValueInput] = useState<string>('R$ 0,00');
  const [productValue, setProductValue] = useState<number>(0);
  const [downPaymentInput, setDownPaymentInput] = useState<string>('R$ 0,00');
  const [downPayment, setDownPayment] = useState<number>(0);
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(12);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [useSpecialRate, setUseSpecialRate] = useState(false);
  const [specialAnnualRatePercent, setSpecialAnnualRatePercent] = useState<string>(String(DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE * 100));
  const navigate = useNavigate();

  const installmentOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}x`}));

  const handleCurrencyInputChange = ( value: string, setValueState: React.Dispatch<React.SetStateAction<number>>, setInputState: React.Dispatch<React.SetStateAction<string>> ) => { setInputState(value); const numericValue = parseBRLCurrencyStringToNumber(value); setValueState(numericValue); };
  const handleCurrencyInputBlur = ( currentValue: number, setInputState: React.Dispatch<React.SetStateAction<string>> ) => { setInputState(formatNumberToBRLCurrencyInput(currentValue)); };

  useEffect(() => {
    const currentAnnualRateDecimal = useSpecialRate && parseFloat(specialAnnualRatePercent) > 0 ? (parseFloat(specialAnnualRatePercent) / 100) : DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE;
    const currentMonthlyRateDecimal = currentAnnualRateDecimal / 12;
    const financedAmount = productValue - downPayment;
    if (productValue > 0 && financedAmount > 0 && numberOfInstallments > 0) {
      const totalInterest = financedAmount * currentMonthlyRateDecimal * numberOfInstallments; 
      const totalPaidOnFinancing = financedAmount + totalInterest;
      const monthlyPayment = totalPaidOnFinancing / numberOfInstallments;
      const grandTotalPaid = downPayment + totalPaidOnFinancing;
      const installmentsTable = Array.from({ length: numberOfInstallments }, (_, i) => ({ installmentNumber: i + 1, value: monthlyPayment, }));
      setSimulationResult({ productValue, downPayment, financedAmount, numberOfInstallments, totalInterest, totalPaidOnFinancing, grandTotalPaid, monthlyPayment, monthlyInterestRatePercent: currentMonthlyRateDecimal * 100, annualInterestRateUsed: currentAnnualRateDecimal * 100, installmentsTable, });
    } else if (productValue > 0 && financedAmount <= 0 && numberOfInstallments > 0) { 
        setSimulationResult({ productValue, downPayment, financedAmount: 0, numberOfInstallments: 1, totalInterest: 0, totalPaidOnFinancing: 0, grandTotalPaid: productValue, monthlyPayment: 0, monthlyInterestRatePercent: 0, annualInterestRateUsed: 0, installmentsTable: [], });
    } else { setSimulationResult(null); }
  }, [productValue, downPayment, numberOfInstallments, useSpecialRate, specialAnnualRatePercent]);

  const handlePrint = () => { const printSection = document.getElementById('simulationPrintSection'); if (printSection) window.print(); };
  const tableColumns = [ { header: 'Parcela', accessor: (item: {installmentNumber: number, value: number}): ReactNode => `${item.installmentNumber}/${simulationResult?.numberOfInstallments}`}, { header: 'Valor da Parcela', accessor: (item: {installmentNumber: number, value: number}): ReactNode => formatCurrencyBRL(item.value)}, ];

  const handleFormalizeOrder = () => {
    if (!simulationResult) {
        alert("Nenhuma simulação válida para formalizar.");
        return;
    }
    const prefillData = {
        sellingPrice: simulationResult.productValue,
        paymentMethod: PaymentMethod.BLU_FACILITA,
        downPayment: simulationResult.downPayment,
        installments: simulationResult.numberOfInstallments,
        bluFacilitaUsesSpecialRate: useSpecialRate,
        bluFacilitaSpecialAnnualRate: useSpecialRate ? parseFloat(specialAnnualRatePercent) : undefined,
    };
    navigate('/orders', { state: { prefillOrderData: prefillData } });
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Dados da Simulação" className="md:col-span-1">
          <div className="space-y-4">
            <Input label="Valor do Produto (R$)" id="productValue" name="productValue" type="text" value={productValueInput} onChange={(e) => handleCurrencyInputChange(e.target.value, setProductValue, setProductValueInput)} onBlur={() => handleCurrencyInputBlur(productValue, setProductValueInput)} placeholder="R$ 0,00" />
            <Input label="Entrada (R$) (Opcional)" id="downPayment" name="downPayment" type="text" value={downPaymentInput} onChange={(e) => handleCurrencyInputChange(e.target.value, setDownPayment, setDownPaymentInput)} onBlur={() => handleCurrencyInputBlur(downPayment, setDownPaymentInput)} placeholder="R$ 0,00" />
            <Select label="Número de Parcelas" id="numberOfInstallments" name="numberOfInstallments" options={installmentOptions} value={String(numberOfInstallments)} onChange={(e) => setNumberOfInstallments(Number(e.target.value))} />
            <div className="mt-4 pt-4 border-t">
                <label htmlFor="useSpecialRate" className="flex items-center space-x-2 text-sm font-medium text-gray-700"> <input type="checkbox" id="useSpecialRate" name="useSpecialRate" checked={useSpecialRate} onChange={(e) => setUseSpecialRate(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" /> <span>Usar Taxa Especial? (Padrão: {DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE * 100}%)</span> </label>
                {useSpecialRate && ( <Input label="Taxa de Juros Anual Especial (%)" id="specialAnnualRatePercent" name="specialAnnualRatePercent" type="number" step="0.01" value={specialAnnualRatePercent} onChange={(e) => setSpecialAnnualRatePercent(e.target.value)} placeholder="Ex: 25" containerClassName="mt-2" /> )}
            </div>
          </div>
        </Card>
        {simulationResult && (
          <Card title="Resultado da Simulação" className="md:col-span-2">
            <div id="simulationPrintSection">
              <h3 className="text-xl font-semibold text-blue-700 mb-4">Resumo do Parcelamento BluFacilita</h3>
              <div className="space-y-2 text-gray-700 mb-6">
                <p><strong>Valor do Produto:</strong> {formatCurrencyBRL(simulationResult.productValue)}</p>
                <p><strong>Entrada:</strong> {formatCurrencyBRL(simulationResult.downPayment)}</p>
                <p><strong>Valor Financiado:</strong> {formatCurrencyBRL(simulationResult.financedAmount)}</p>
                <p><strong>Número de Parcelas:</strong> {simulationResult.financedAmount > 0 ? simulationResult.numberOfInstallments : 'N/A (Pago com entrada)'}x</p>
                {simulationResult.financedAmount > 0 && ( <> <p><strong>Taxa de Juros Anual Utilizada:</strong> {simulationResult.annualInterestRateUsed.toFixed(2)}%</p> <p><strong>Taxa de Juros Mensal (simples):</strong> {simulationResult.monthlyInterestRatePercent.toFixed(3)}%</p> </> )}
                <hr className="my-2"/>
                {simulationResult.financedAmount > 0 && ( <> <p className="text-lg"><strong>Valor da Parcela Mensal:</strong> <span className="font-bold text-green-600">{formatCurrencyBRL(simulationResult.monthlyPayment)}</span></p> <p><strong>Juros Totais sobre o Financiamento:</strong> {formatCurrencyBRL(simulationResult.totalInterest)}</p> <p><strong>Total Pago no Financiamento:</strong> {formatCurrencyBRL(simulationResult.totalPaidOnFinancing)}</p> </> )}
                <p className="text-lg font-semibold"><strong>Custo Total para o Cliente:</strong> <span className="font-bold text-blue-800">{formatCurrencyBRL(simulationResult.grandTotalPaid)}</span></p>
              </div>
              {simulationResult.installmentsTable.length > 0 && simulationResult.financedAmount > 0 && ( <> <h4 className="text-md font-semibold text-gray-800 mb-2">Detalhamento das Parcelas:</h4> <ResponsiveTable columns={tableColumns} data={simulationResult.installmentsTable} rowKeyAccessor="installmentNumber" /> </> )}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button onClick={handleFormalizeOrder} variant="primary">Formalizar Encomenda</Button>
              <Button onClick={handlePrint} variant="secondary" leftIcon={<PrintIcon className="h-5 w-5" />}> Imprimir Simulação </Button>
            </div>
          </Card>
        )}
        {!simulationResult && productValue <= 0 && ( <Card className="md:col-span-2 flex items-center justify-center"> <p className="text-gray-500">Preencha o valor do produto para ver a simulação.</p> </Card> )}
         {simulationResult && productValue > 0 && simulationResult.financedAmount <= 0 && ( <Card className="md:col-span-2 flex items-center justify-center"> <p className="text-green-600 font-semibold">O valor da entrada cobre o total do produto. Não há financiamento.</p> </Card> )}
    </div>
  );
};

interface ViewInstallmentsModalProps { order: Order; isOpen: boolean; onClose: () => void; onContractUpdate: () => void; onRegisterPayment: (order: Order) => void; }

const ViewInstallmentsModal: React.FC<ViewInstallmentsModalProps> = ({ order, isOpen, onClose, onContractUpdate, onRegisterPayment }) => {
    const [clientFullName, setClientFullName] = useState<string>(order.customerName);

    useEffect(() => {
        const fetchClientData = async () => {
            if (order.clientId) {
                try {
                    const client = await getClientById(order.clientId);
                    if (client) {
                        setClientFullName(client.fullName);
                    }
                } catch (error) {
                    console.error("Failed to fetch client for installments modal", error);
                    // Keep existing customerName from order as fallback
                }
            }
        };
        if (isOpen) {
            fetchClientData();
        }
    }, [isOpen, order.clientId, order.customerName]);


    const installments = order.bluFacilitaInstallments || [];

    const installmentColumns = [
        { header: 'Nº', accessor: 'installmentNumber' as keyof BluFacilitaInstallment },
        { header: 'Vencimento', accessor: (item: BluFacilitaInstallment): ReactNode => formatDateBR(item.dueDate) },
        { header: 'Valor Parcela', accessor: (item: BluFacilitaInstallment): ReactNode => formatCurrencyBRL(item.amount) },
        { header: 'Status', accessor: (item: BluFacilitaInstallment): ReactNode => (
            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                item.status === 'Pago' ? 'bg-green-100 text-green-700' :
                item.status === 'Pago Parcialmente' ? 'bg-yellow-100 text-yellow-700' :
                item.status === 'Atrasado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}>
                {item.status}
            </span>
        )},
        { header: 'Valor Pago', accessor: (item: BluFacilitaInstallment): ReactNode => formatCurrencyBRL(item.amountPaid) },
        { header: 'Data Pag.', accessor: (item: BluFacilitaInstallment): ReactNode => formatDateBR(item.paymentDate) },
        { header: 'Obs.', accessor: 'notes' as keyof BluFacilitaInstallment, cellClassName: "text-xs max-w-xs whitespace-normal" },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes das Parcelas: ${order.productName}`} size="2xl">
            <div className="space-y-4">
                <p><strong>Cliente:</strong> {clientFullName}</p>
                <p><strong>Total Financiado (com juros):</strong> {formatCurrencyBRL(order.totalWithInterest)}</p>
                <ResponsiveTable columns={installmentColumns} data={installments} rowKeyAccessor="installmentNumber" emptyStateMessage="Nenhuma parcela encontrada." />
            </div>
            <div className="mt-6 flex justify-between items-center">
                <Button variant="primary" onClick={() => { onClose(); onRegisterPayment(order);}} leftIcon={<CreditCardPlusIcon className="h-5 w-5"/>}>
                    Registrar Recebimento
                </Button>
                <Button variant="secondary" onClick={onClose}>Fechar</Button>
            </div>
        </Modal>
    );
};


const ActiveContractsTab: React.FC = () => {
    const [allContracts, setAllContracts] = useState<Order[]>([]);
    const [filteredContracts, setFilteredContracts] = useState<Order[]>([]);
    const [clientsMap, setClientsMap] = useState<Map<string, Client>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imeiActionModalOpen, setImeiActionModalOpen] = useState(false);
    const [orderForImeiAction, setOrderForImeiAction] = useState<Order | null>(null);
    const [imeiCopied, setImeiCopied] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | BluFacilitaContractStatus>('all');
    const [viewingInstallmentsOrder, setViewingInstallmentsOrder] = useState<Order | null>(null);
    const [orderToRegisterPayment, setOrderToRegisterPayment] = useState<Order | null>(null);


    const fetchContracts = useCallback(async () => { 
        setIsLoading(true); 
        setError(null); 
        try { 
            const allOrders = await getOrders(); 
            const bluFacilitaOrders = allOrders.filter(o => o.paymentMethod === PaymentMethod.BLU_FACILITA).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()); 
            setAllContracts(bluFacilitaOrders); 
            
            const clientIds = new Set(bluFacilitaOrders.map(o => o.clientId).filter(id => id !== undefined) as string[]); 
            if (clientIds.size > 0) { 
                const fetchedClients = await getClients();
                const map = new Map<string, Client>(); 
                fetchedClients.filter(c => clientIds.has(c.id)).forEach(c => map.set(c.id, c)); 
                setClientsMap(map); 
            } 
        } catch (err) { 
            setError("Falha ao carregar contratos: " + (err instanceof Error ? err.message : String(err))); 
            console.error("Error in fetchContracts:", err); 
        } finally { 
            setIsLoading(false); 
        } 
    }, []);

    useEffect(() => { fetchContracts(); }, [fetchContracts]);
    useEffect(() => { if (statusFilter === 'all') { setFilteredContracts(allContracts); } else { setFilteredContracts(allContracts.filter(c => c.bluFacilitaContractStatus === statusFilter)); } }, [allContracts, statusFilter]);
    
    const handleOpenImeiActionModal = (order: Order) => { setOrderForImeiAction(order); setImeiActionModalOpen(true); setImeiCopied(false); };
    
    const handleConfirmImeiAction = async () => { 
        if(orderForImeiAction){ 
            const updatedOrder = { ...orderForImeiAction, imeiBlocked: !orderForImeiAction.imeiBlocked }; 
            await saveOrder(updatedOrder); 
            await fetchContracts(); 
        } 
        setImeiActionModalOpen(false); 
        setOrderForImeiAction(null); 
    };

    const handleCopyImei = async () => { if (orderForImeiAction?.imei) { try { await navigator.clipboard.writeText(orderForImeiAction.imei); setImeiCopied(true); setTimeout(() => setImeiCopied(false), 2000); } catch (err) { console.error('Failed to copy IMEI: ', err); alert('Falha ao copiar IMEI. Por favor, copie manualmente.'); } } };
    const filterOptions = [ { value: 'all', label: 'Todos os Status' }, ...BLU_FACILITA_CONTRACT_STATUS_OPTIONS.map(s => ({ value: s, label: s })) ];

    const handlePaymentRegistered = async (payment: ClientPayment) => { // Mark as async
        await fetchContracts();  // Await if fetchContracts has side effects you need completed before proceeding
        setOrderToRegisterPayment(null); 
    };

    const columns = [
        { header: 'Cliente', accessor: (item: Order): ReactNode => clientsMap.get(item.clientId || '')?.fullName || item.customerName || 'N/A' },
        { header: 'Produto', accessor: (item: Order): ReactNode => `${item.productName} ${item.model}` },
        { header: 'Total Contrato', accessor: (item: Order): ReactNode => formatCurrencyBRL((item.totalWithInterest || 0) + (item.downPayment || 0)) },
        { 
            header: 'Detalhes Parcelas', 
            accessor: (item: Order): ReactNode => (
                <Button variant="link" size="sm" onClick={() => setViewingInstallmentsOrder(item)} className="p-0 text-blue-600 hover:text-blue-800">
                 Ver Parcelas
                </Button>
            )
        },
        { 
            header: 'Valor Pendente', 
            accessor: (item: Order): ReactNode => {
                const totalPaidOnInstallments = item.bluFacilitaInstallments?.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0) || 0;
                const totalContractValueAfterDownPayment = item.totalWithInterest || 0;
                const outstandingAmount = totalContractValueAfterDownPayment - totalPaidOnInstallments;
                return formatCurrencyBRL(Math.max(0, outstandingAmount));
            },
            cellClassName: "font-medium text-orange-600"
        },
        { header: 'Data Compra', accessor: (item: Order): ReactNode => formatDateBR(item.orderDate) },
        { header: 'Status Contrato', accessor: (item: Order): ReactNode => ( <Select id={`status-contract-${item.id}`} value={item.bluFacilitaContractStatus || ''} options={BLU_FACILITA_CONTRACT_STATUS_OPTIONS.map(s => ({value: s, label:s}))} onChange={async (e) => { const newStatus = e.target.value as BluFacilitaContractStatus; await saveOrder({...item, bluFacilitaContractStatus: newStatus}); fetchContracts(); }} selectClassName={`text-xs p-1 h-8 font-semibold ${item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO ? 'text-red-600' : item.bluFacilitaContractStatus === BluFacilitaContractStatus.EM_DIA ? 'text-green-600' : 'text-gray-700'}`} containerClassName="min-w-[120px]" /> ) },
        { header: 'Ações', accessor: (item: Order): ReactNode => ( <div className="flex flex-col space-y-1 items-start"> {item.imei && item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO && ( <Button variant={item.imeiBlocked ? "ghost" : "danger"} size="sm" onClick={() => handleOpenImeiActionModal(item)} leftIcon={item.imeiBlocked ? <LockOpenIcon className="h-4 w-4"/> : <LockClosedIcon className="h-4 w-4"/>} > {item.imeiBlocked ? 'Gerenciar IMEI (Bloqueado)' : 'Bloquear IMEI'} </Button> )} <Button variant="link" size="sm" onClick={() => setOrderToRegisterPayment(item)} leftIcon={<CreditCardPlusIcon className="h-4 w-4"/>}> Registrar Recebimento </Button> </div> )},
    ];

    if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (error) return <Alert type="error" message={error} onClose={() => setError(null)} />;

    return ( <> <Card className="mb-4"> <Select id="bfStatusFilter" label="Filtrar por Status do Contrato" options={filterOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} /> </Card> <ResponsiveTable columns={columns} data={filteredContracts} rowKeyAccessor="id" emptyStateMessage="Nenhum contrato BluFacilita ativo encontrado com os filtros atuais." /> {imeiActionModalOpen && orderForImeiAction && ( <Modal isOpen={imeiActionModalOpen} onClose={() => { setImeiActionModalOpen(false); setOrderForImeiAction(null);}} title={`${orderForImeiAction.imeiBlocked ? 'Gerenciar IMEI (Bloqueado)' : 'Confirmar Bloqueio de IMEI'}`} size="md" footer={ <> <Button variant="secondary" onClick={() => { setImeiActionModalOpen(false); setOrderForImeiAction(null);}}>Cancelar</Button> <Button variant={orderForImeiAction.imeiBlocked ? "primary" : "danger"} onClick={handleConfirmImeiAction} > {orderForImeiAction.imeiBlocked ? 'Marcar como Desbloqueado' : 'Marcar como Bloqueado'} </Button> </> } > <p className="text-gray-700"> Pedido de: <span className="font-semibold">{clientsMap.get(orderForImeiAction.clientId || '')?.fullName || orderForImeiAction.customerName}</span> </p> <p className="text-gray-700 mt-1"> Produto: <span className="font-semibold">{orderForImeiAction.productName} {orderForImeiAction.model}</span> </p> {orderForImeiAction.imei && ( <div className="mt-3"> <label className="block text-sm font-medium text-gray-700">IMEI:</label> <div className="flex items-center space-x-2"> <Input id="imeiDisplay" type="text" value={orderForImeiAction.imei} readOnly inputClassName="bg-gray-100" /> <Button variant="ghost" onClick={handleCopyImei} size="sm" leftIcon={<ClipboardDocumentIcon className="h-5 w-5"/>}> {imeiCopied ? 'Copiado!' : 'Copiar'} </Button> </div> </div> )} <p className="text-sm text-gray-600 mt-4"> Esta ação é para controle interno e <strong>não</strong> realiza bloqueio/desbloqueio real na operadora. </p> {orderForImeiAction.imeiBlocked && <Alert type="warning" message="Este IMEI já está marcado como bloqueado internamente." className="mt-3"/>} </Modal> )} {viewingInstallmentsOrder && ( <ViewInstallmentsModal order={viewingInstallmentsOrder} isOpen={!!viewingInstallmentsOrder} onClose={() => setViewingInstallmentsOrder(null)} onContractUpdate={fetchContracts} onRegisterPayment={setOrderToRegisterPayment} /> )} {orderToRegisterPayment && ( <RegisterPaymentModal order={orderToRegisterPayment} isOpen={!!orderToRegisterPayment} onClose={() => setOrderToRegisterPayment(null)} onPaymentSaved={handlePaymentRegistered} /> )} </> );
};


export const BluFacilitaPage: React.FC<{}> = () => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'contracts'>('simulation');
  return ( <div className="blu-facilita-page"> <PageTitle title="BluFacilita - Crédito da Casa" subtitle="Simule parcelamentos e gerencie contratos ativos." /> <Tabs className="mb-6"> <Tab label="Simular Financiamento" isActive={activeTab === 'simulation'} onClick={() => setActiveTab('simulation')} /> <Tab label="Contratos Ativos" isActive={activeTab === 'contracts'} onClick={() => setActiveTab('contracts')} /> </Tabs> {activeTab === 'simulation' && <SimulationTab />} {activeTab === 'contracts' && <ActiveContractsTab />} <style>{` @media print { body * { visibility: hidden; margin: 0; padding: 0; } #simulationPrintSection, #simulationPrintSection * { visibility: visible; } #simulationPrintSection { position: absolute; left: 20px; top: 20px; width: calc(100% - 40px); font-family: Arial, sans-serif; } #simulationPrintSection h3, #simulationPrintSection h4 { color: #333 !important; } #simulationPrintSection p strong { font-weight: bold; } #simulationPrintSection .text-green-600 { color: #056608 !important; } #simulationPrintSection .text-blue-800 { color: #000080 !important; } #simulationPrintSection table { width: 100%; border-collapse: collapse; margin-top: 10px; } #simulationPrintSection th, #simulationPrintSection td { border: 1px solid #ccc; padding: 8px; text-align: left; } #simulationPrintSection th { background-color: #f0f0f0; } .blu-facilita-page > div:not(:has(#simulationPrintSection)), .blu-facilita-page button, .blu-facilita-page .md\\:col-span-1, .blu-facilita-page .blu-facilita-tabs { display: none !important; } } `}</style> </div> );
};