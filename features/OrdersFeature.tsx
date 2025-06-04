import React, { useState, useEffect, useCallback, useMemo, ReactNode, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; 
import { Order, OrderStatus, ProductCondition, DocumentFile, Client, PaymentMethod, PAYMENT_METHOD_OPTIONS, BLU_FACILITA_CONTRACT_STATUS_OPTIONS, BluFacilitaContractStatus, Supplier, SupplierOption, InternalNote, DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE, ClientType, ClientPayment } from '../types';
import { 
  saveOrder, getOrders, deleteOrder, getOrderById as getOrderByIdService, 
  ORDER_STATUS_OPTIONS, PRODUCT_CONDITION_OPTIONS, 
  formatCurrencyBRL, formatDateBR, exportToCSV,
  getClients, getClientById, saveClient, 
  getSuppliers, getSupplierById, 
  parseBRLCurrencyStringToNumber, formatNumberToBRLCurrencyInput,
  cleanPhoneNumberForWhatsApp,
  calculateBluFacilitaDetails, 
  getClientPaymentsByOrderId,
} from '../services/AppService';
import { Button, Modal, Input, Select, Textarea, Card, PageTitle, Alert, ResponsiveTable, Spinner, WhatsAppIcon, ClipboardDocumentIcon } from '../components/SharedComponents';
import { v4 as uuidv4 } from 'uuid';
import { EyeIcon, EyeSlashIcon, RegisterPaymentModal } from '../App'; 


// Icons
const LockClosedIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const LockOpenIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m.75 11.25H18A2.25 2.25 0 0020.25 18v-6.75A2.25 2.25 0 0018 9H6.75A2.25 2.25 0 004.5 11.25v6.75A2.25 2.25 0 006.75 21H9M10.5 10.5V6.75" />
  </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125.504 1.125 1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);


const useCountdown = (targetDateString?: string) => { 
  const calculateTimeLeft = useCallback(() => {
    if (!targetDateString) return null;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/; // Expect YYYY-MM-DD
    
    let targetDateTime: Date;

    if (isoDateRegex.test(targetDateString)) {
        const [year, month, day] = targetDateString.split('-').map(Number);
        targetDateTime = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
        const directDate = new Date(targetDateString);
        if (isNaN(directDate.getTime())) {
            return { overdue: true, error: 'Data inválida (formato)' };
        }
        targetDateTime = new Date(directDate.getFullYear(), directDate.getMonth(), directDate.getDate(), 23, 59, 59, 999);
    }

    const difference = +targetDateTime - +new Date();
    let timeLeft: { days?: number; hours?: number; minutes?: number; seconds?: number; overdue?: boolean; error?: string } = {};

    if (difference > 0) {
      timeLeft = { days: Math.floor(difference / (1000 * 60 * 60 * 24)), hours: Math.floor((difference / (1000 * 60 * 60)) % 24), minutes: Math.floor((difference / 1000 / 60) % 60), seconds: Math.floor((difference / 1000) % 60), overdue: false, };
    } else { timeLeft = { overdue: true }; }
    return timeLeft;
  }, [targetDateString]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => { if (!targetDateString) { setTimeLeft(null); return; } setTimeLeft(calculateTimeLeft()); const intervalId = setInterval(() => { setTimeLeft(calculateTimeLeft()); }, 60000); 
    return () => clearInterval(intervalId); 
  }, [targetDateString, calculateTimeLeft]);
  return timeLeft;
};

const CountdownDisplay: React.FC<{ targetDate?: string }> = ({ targetDate }) => {
  const timeLeft = useCountdown(targetDate); 
  if (!targetDate) return <span className="text-sm text-gray-500">Sem prazo</span>;
  if (!timeLeft) return <Spinner size="sm" />;
  if (timeLeft.error) return <span className="text-sm text-red-500 font-semibold">{timeLeft.error}</span>;
  if (timeLeft.overdue) return <span className="text-sm text-red-500 font-semibold">Atrasado</span>;
  return ( <span className="text-sm text-blue-600"> {timeLeft.days !== undefined && timeLeft.days > 0 && `${timeLeft.days}d `} {timeLeft.hours !== undefined && `${String(timeLeft.hours).padStart(2, '0')}h `} {timeLeft.minutes !== undefined && `${String(timeLeft.minutes).padStart(2, '0')}m`} </span> );
};

const OrderStatusTimeline: React.FC<{ order: Order }> = ({ order }) => {
  const getStatusHistory = (status: OrderStatus) => order.trackingHistory?.find(h => h.status === status);
  
  const relevantStatuses = useMemo(() => {
    if ((order.status as OrderStatus) === OrderStatus.CANCELADO) {
        return [OrderStatus.PEDIDO_REALIZADO, OrderStatus.CANCELADO];
    }
    const typicalPath: OrderStatus[] = [
        OrderStatus.PEDIDO_REALIZADO, OrderStatus.PAGAMENTO_CONFIRMADO, OrderStatus.EM_PROCESSAMENTO,
        OrderStatus.PEDIDO_ENVIADO, OrderStatus.CHEGOU_NO_BRASIL, OrderStatus.LIBERADO_PELA_ALFANDEGA,
        OrderStatus.PRONTO_PARA_ENTREGA, OrderStatus.ENTREGUE
    ];
    let displayStatusesSet = new Set<OrderStatus>();
    order.trackingHistory?.forEach(h => displayStatusesSet.add(h.status));
    displayStatusesSet.add(order.status);
    const currentIdxInTypical = typicalPath.indexOf(order.status);
    typicalPath.slice(0, currentIdxInTypical !== -1 ? currentIdxInTypical + 2 : typicalPath.length).forEach(s => displayStatusesSet.add(s));
    if (!displayStatusesSet.has(OrderStatus.ENTREGUE) && order.status !== OrderStatus.CANCELADO) {
        displayStatusesSet.add(OrderStatus.ENTREGUE); 
    }
    let displayStatuses = Array.from(displayStatusesSet);
    displayStatuses.sort((a, b) => ORDER_STATUS_OPTIONS.indexOf(a) - ORDER_STATUS_OPTIONS.indexOf(b));
    return displayStatuses;
  }, [order.status, order.trackingHistory]);

  if (!order.trackingHistory || order.trackingHistory.length === 0) { 
    return (<div><p className="text-sm text-gray-600 mb-1">Status Atual:</p><span className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">{order.status}</span></div>);
  }

  return (
    <div className="space-y-3">
      {relevantStatuses.map((status, index) => {
        const historyEntry = getStatusHistory(status);
        const isCurrentActualStatus = order.status === status;
        const isPastStatus = historyEntry && ORDER_STATUS_OPTIONS.indexOf(status) < ORDER_STATUS_OPTIONS.indexOf(order.status);

        return (
          <div key={status} className="flex items-start">
            <div className="flex flex-col items-center mr-3">
              <div className={`w-3 h-3 rounded-full ${
                  isCurrentActualStatus ? 'bg-blue-500 animate-pulse' : (historyEntry || isPastStatus ? 'bg-green-500' : 'bg-gray-300')
              }`} />
              {index < relevantStatuses.length - 1 && <div className="w-px h-8 bg-gray-300" />}
            </div>
            <div>
              <p className={`text-sm ${
                  isCurrentActualStatus ? 'text-blue-700 font-semibold' : (historyEntry || isPastStatus ? 'text-green-700' : 'text-gray-500')
              }`}>
                {status}
              </p>
              {historyEntry && (
                <p className="text-xs text-gray-500">
                  {formatDateBR(historyEntry.date, true)}
                  {historyEntry.notes ? ` - ${historyEntry.notes}` : ''}
                </p>
              )}
              {isCurrentActualStatus && !historyEntry && (<p className="text-xs text-gray-500">Status atual</p>)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const initialFormData: Omit<Order, 'id' | 'documents' | 'trackingHistory' | 'customerName' | 'supplierName' | 'internalNotes' | 'bluFacilitaInstallments'> & { customerNameManual: string } = {
  clientId: undefined,
  customerNameManual: '', 
  productName: '', model: '', capacity: '', color: '',
  condition: ProductCondition.LACRADO,
  supplierId: undefined,
  purchasePrice: 0, sellingPrice: undefined,
  status: OrderStatus.PEDIDO_REALIZADO,
  estimatedDeliveryDate: '',
  orderDate: new Date().toISOString().split('T')[0], 
  notes: '',
  paymentMethod: PaymentMethod.A_VISTA,
  downPayment: 0, installments: 12, 
  financedAmount: 0, totalWithInterest: 0, installmentValue: 0,
  bluFacilitaContractStatus: BluFacilitaContractStatus.EM_DIA,
  imeiBlocked: false,
  arrivalDate: undefined, imei: undefined, arrivalPhotos: [], arrivalNotes: undefined, batteryHealth: undefined, readyForDelivery: false,
  shippingCostSupplierToBlu: undefined, shippingCostBluToClient: undefined,
  whatsAppHistorySummary: undefined,
  bluFacilitaUsesSpecialRate: false, bluFacilitaSpecialAnnualRate: undefined,
};


interface OrderFormProps { isOpen: boolean; onClose: () => void; onSave: (order: Order) => Promise<void>; initialOrder?: Order | null; prefillData?: Partial<OrderFormPrefillData>; }
interface OrderFormPrefillData {
    sellingPrice?: number;
    downPayment?: number;
    installments?: number;
    bluFacilitaUsesSpecialRate?: boolean;
    bluFacilitaSpecialAnnualRate?: number;
    paymentMethod?: PaymentMethod;
}


const OrderForm: React.FC<OrderFormProps> = ({ isOpen, onClose, onSave, initialOrder, prefillData }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [currentInternalNote, setCurrentInternalNote] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bfProductValueForSim, setBfProductValueForSim] = useState(0);
  const [bfDownPaymentInput, setBfDownPaymentInput] = useState('R$ 0,00');

  useEffect(() => {
    const fetchData = async () => {
        try {
            setClients(await getClients());
            setSuppliers(await getSuppliers());
        } catch (e) {
            console.error("Error fetching clients/suppliers for form", e);
            setError("Falha ao carregar dados de clientes/fornecedores.");
        }
    };
    if (isOpen) {
        fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    const initializeForm = async () => {
        let effectiveInitialData = { ...initialFormData, orderDate: new Date().toISOString().split('T')[0] };
        let effectiveDocuments: DocumentFile[] = [];
        let effectiveInternalNotes: InternalNote[] = [];
        let initialBfProductValue = 0;
        let initialBfDownPayment = 0;

        if (initialOrder) {
        const client = initialOrder.clientId ? await getClientById(initialOrder.clientId) : null;
        effectiveInitialData = {
            ...effectiveInitialData,
            clientId: initialOrder.clientId,
            customerNameManual: client ? '' : initialOrder.customerName,
            productName: initialOrder.productName, model: initialOrder.model, capacity: initialOrder.capacity, color: initialOrder.color,
            condition: initialOrder.condition,
            supplierId: initialOrder.supplierId || undefined,
            purchasePrice: initialOrder.purchasePrice, sellingPrice: initialOrder.sellingPrice,
            status: initialOrder.status,
            estimatedDeliveryDate: initialOrder.estimatedDeliveryDate ? new Date(initialOrder.estimatedDeliveryDate + "T00:00:00").toISOString().split('T')[0] : '',
            orderDate: initialOrder.orderDate ? new Date(initialOrder.orderDate + "T00:00:00").toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            notes: initialOrder.notes || '',
            paymentMethod: initialOrder.paymentMethod || PaymentMethod.A_VISTA,
            downPayment: initialOrder.downPayment || 0,
            installments: initialOrder.installments || 12,
            bluFacilitaContractStatus: initialOrder.bluFacilitaContractStatus || BluFacilitaContractStatus.EM_DIA,
            arrivalDate: initialOrder.arrivalDate ? new Date(initialOrder.arrivalDate + "T00:00:00").toISOString().split('T')[0] : undefined,
            imei: initialOrder.imei, arrivalNotes: initialOrder.arrivalNotes, batteryHealth: initialOrder.batteryHealth,
            readyForDelivery: initialOrder.readyForDelivery,
            imeiBlocked: initialOrder.imeiBlocked || false,
            shippingCostSupplierToBlu: initialOrder.shippingCostSupplierToBlu,
            shippingCostBluToClient: initialOrder.shippingCostBluToClient,
            whatsAppHistorySummary: initialOrder.whatsAppHistorySummary,
            bluFacilitaUsesSpecialRate: initialOrder.bluFacilitaUsesSpecialRate || false,
            bluFacilitaSpecialAnnualRate: initialOrder.bluFacilitaSpecialAnnualRate,
        };
        effectiveDocuments = initialOrder.documents || [];
        effectiveInternalNotes = initialOrder.internalNotes || [];
        initialBfProductValue = initialOrder.sellingPrice || initialOrder.purchasePrice || 0;
        initialBfDownPayment = initialOrder.downPayment || 0;
        }

        if (prefillData) {
            effectiveInitialData = {
                ...effectiveInitialData,
                sellingPrice: prefillData.sellingPrice ?? effectiveInitialData.sellingPrice,
                paymentMethod: prefillData.paymentMethod ?? effectiveInitialData.paymentMethod,
                downPayment: prefillData.downPayment ?? effectiveInitialData.downPayment,
                installments: prefillData.installments ?? effectiveInitialData.installments,
                bluFacilitaUsesSpecialRate: prefillData.bluFacilitaUsesSpecialRate ?? effectiveInitialData.bluFacilitaUsesSpecialRate,
                bluFacilitaSpecialAnnualRate: prefillData.bluFacilitaSpecialAnnualRate ?? effectiveInitialData.bluFacilitaSpecialAnnualRate,
            };
            initialBfProductValue = prefillData.sellingPrice ?? initialBfProductValue;
            initialBfDownPayment = prefillData.downPayment ?? initialBfDownPayment;
        }

        setFormData(effectiveInitialData);
        setDocuments(effectiveDocuments);
        setInternalNotes(effectiveInternalNotes);
        setBfProductValueForSim(initialBfProductValue);
        setBfDownPaymentInput(formatNumberToBRLCurrencyInput(initialBfDownPayment));
        setCurrentInternalNote('');
    };

    if (isOpen) {
        initializeForm();
    }
  }, [initialOrder, isOpen, prefillData]);


  useEffect(() => {
    if (formData.paymentMethod === PaymentMethod.BLU_FACILITA) {
        const productVal = formData.sellingPrice || formData.purchasePrice || 0; 
        setBfProductValueForSim(productVal); 
        const downPaymentVal = parseBRLCurrencyStringToNumber(bfDownPaymentInput);
        
        const annualRateToUse = formData.bluFacilitaUsesSpecialRate && formData.bluFacilitaSpecialAnnualRate !== undefined
            ? formData.bluFacilitaSpecialAnnualRate / 100
            : DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE;

        if (productVal > 0 && formData.installments && formData.installments > 0) {
             const bfDetails = calculateBluFacilitaDetails(productVal, downPaymentVal, formData.installments, annualRateToUse);
            setFormData(prev => ({ 
                ...prev, 
                downPayment: downPaymentVal, 
                financedAmount: bfDetails.financedAmount, 
                totalWithInterest: bfDetails.totalWithInterest, 
                installmentValue: bfDetails.installmentValue 
            }));
        } else {
             setFormData(prev => ({ 
                 ...prev, 
                 downPayment: downPaymentVal, 
                 financedAmount: Math.max(0, productVal - downPaymentVal), 
                 totalWithInterest: Math.max(0, productVal - downPaymentVal), 
                 installmentValue: 0 
            }));
        }
    }
  }, [formData.paymentMethod, formData.sellingPrice, formData.purchasePrice, bfDownPaymentInput, formData.installments, formData.bluFacilitaUsesSpecialRate, formData.bluFacilitaSpecialAnnualRate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "bluFacilitaUsesSpecialRate") {
        setFormData(prev => ({ ...prev, bluFacilitaUsesSpecialRate: checked, bluFacilitaSpecialAnnualRate: checked ? prev.bluFacilitaSpecialAnnualRate : undefined }));
    } else if (["purchasePrice", "sellingPrice", "shippingCostSupplierToBlu", "shippingCostBluToClient", "bluFacilitaSpecialAnnualRate", "batteryHealth"].includes(name)) {
        const numericValue = parseFloat(value);
        setFormData(prev => ({ ...prev, [name]: isNaN(numericValue) ? undefined : numericValue }));
        if (name === "sellingPrice" || (name === "purchasePrice" && !formData.sellingPrice)) {
            setBfProductValueForSim(isNaN(numericValue) ? 0 : numericValue);
        }
    } else if (name === "supplierId" || name === "clientId") {
        setFormData(prev => ({ ...prev, [name]: value || undefined }));
    } else if (type === 'number' && name === 'installments') {
        setFormData(prev => ({...prev, [name]: parseInt(value, 10) || 1 }));
    } else if (type === 'checkbox' && name === 'readyForDelivery') {
        setFormData(prev => ({ ...prev, [name]: checked }));
    }
     else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBfDownPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => setBfDownPaymentInput(e.target.value);
  const handleBfDownPaymentBlur = () => setBfDownPaymentInput(formatNumberToBRLCurrencyInput(parseBRLCurrencyStringToNumber(bfDownPaymentInput)));
  
  const handleAddInternalNote = () => { if (currentInternalNote.trim()) { setInternalNotes(prev => [...prev, { id: uuidv4(), date: new Date().toISOString(), note: currentInternalNote.trim() }]); setCurrentInternalNote(''); } };
  const handleRemoveInternalNote = (noteId: string) => setInternalNotes(prev => prev.filter(n => n.id !== noteId));
  const handleAddDocument = () => { const docName = prompt("Nome do documento (ex: Contrato, Invoice):"); if (docName) { setDocuments(prev => [...prev, { id: uuidv4(), name: docName, url: '#mocklink', uploadedAt: new Date().toISOString() }]); } };
  const handleRemoveDocument = (docId: string) => setDocuments(prev => prev.filter(doc => doc.id !== docId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setIsLoading(true);
    if ((!formData.clientId && !formData.customerNameManual) || !formData.productName || !formData.model) { setError("Cliente (existente ou manual), Produto e Modelo são obrigatórios."); setIsLoading(false); return; }
    if (formData.purchasePrice < 0) { setError("Valor pago não pode ser negativo."); setIsLoading(false); return; }
    if (formData.paymentMethod === PaymentMethod.BLU_FACILITA && (formData.sellingPrice || formData.purchasePrice || 0) <= 0) { setError("Valor do produto (venda ou compra) deve ser maior que zero para BluFacilita."); setIsLoading(false); return; }
    
    const selectedSupplierObj = formData.supplierId ? await getSupplierById(formData.supplierId) : null;
    const selectedClientObj = formData.clientId ? await getClientById(formData.clientId) : null;
    
    const orderToSave: Order = {
      ...formData,
      id: initialOrder?.id || uuidv4(), 
      customerName: formData.clientId ? (selectedClientObj?.fullName || 'Cliente não encontrado') : formData.customerNameManual,
      supplierName: selectedSupplierObj?.name, 
      estimatedDeliveryDate: formData.estimatedDeliveryDate || undefined, 
      documents, internalNotes,
      trackingHistory: initialOrder?.trackingHistory || [{ status: formData.status, date: new Date().toISOString(), notes:"Pedido Criado" }],
      downPayment: formData.paymentMethod === PaymentMethod.BLU_FACILITA ? parseBRLCurrencyStringToNumber(bfDownPaymentInput) : undefined,
      installments: formData.paymentMethod === PaymentMethod.BLU_FACILITA ? formData.installments : undefined,
      bluFacilitaInstallments: initialOrder?.bluFacilitaInstallments, 
    };
    if (initialOrder && initialOrder.status !== formData.status) { const newHistoryEntry = { status: formData.status, date: new Date().toISOString(), notes: "Status atualizado manualmente" }; orderToSave.trackingHistory = [...(initialOrder.trackingHistory || []), newHistoryEntry]; }
    try { await onSave(orderToSave); onClose(); } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar encomenda.");
    } finally { setIsLoading(false); }
  };

  const supplierOptions: SupplierOption[] = useMemo(() => [{ value: '', label: 'Selecionar Fornecedor...' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))], [suppliers]);
  
  const handleWhatsAppConsult = async () => { 
    if (!formData.supplierId) { alert("Selecione um fornecedor."); return; } 
    const supplier = await getSupplierById(formData.supplierId); 
    if (!supplier || !supplier.phone) { alert("Fornecedor sem telefone cadastrado."); return; } 
    const productName = formData.productName || "Produto"; const model = formData.model || "Modelo"; const capacity = formData.capacity || ""; const color = formData.color || ""; 
    const message = encodeURIComponent(`Oi, você tem ${productName} ${model} ${capacity} ${color} disponível? Qual o valor?`); 
    const whatsappUrl = `https://wa.me/${cleanPhoneNumberForWhatsApp(supplier.phone)}?text=${message}`; window.open(whatsappUrl, '_blank'); 
  };

  const generateNotaFiscalDescription = () => { const { productName, model, capacity, color, condition } = formData; const marcaModelo = `${productName || "PRODUTO"} ${model || "MODELO"}`; const armazenamento = capacity || "ARMAZENAMENTO"; const cor = color || "COR"; const estado = condition || "ESTADO"; const desc = `Serviço de intermediação para a compra do seguinte produto: ${marcaModelo} com ${armazenamento} de armazenamento na cor ${cor}, ${estado}.

Observações: O valor desta nota fiscal refere-se exclusivamente ao serviço de intermediação prestado pela Blu Imports. Trabalhamos sob encomenda, intermediando ou importando produtos conforme solicitado pelo cliente, sem manter estoque próprio. A transação foi realizada com base em contrato assinado e autenticado por meio da plataforma Autentique.`;
    navigator.clipboard.writeText(desc).then(() => { alert("Descrição da Nota Fiscal copiada para a área de transferência!"); }).catch(err => { console.error('Erro ao copiar descrição: ', err); alert('Erro ao copiar descrição. Veja o console.'); const modal = document.createElement('div'); modal.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;"> <div style="background:white;padding:20px;border-radius:8px;max-width:500px;white-space:pre-wrap;"> <h3>Descrição para Nota Fiscal:</h3> <textarea rows="10" style="width:100%;margin-top:10px;" readonly>${desc}</textarea> <button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px;">Fechar</button> </div> </div>`; document.body.appendChild(modal); }); };
  
  const selectedClientDetails = formData.clientId ? clients.find(c => c.id === formData.clientId) : null;


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialOrder ? 'Editar Encomenda' : 'Adicionar Nova Encomenda'} size="3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Detalhes do Cliente e Produto" className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="Cliente (Existente)" id="clientId" name="clientId" value={formData.clientId || ''} onChange={handleChange} options={[{value: '', label: 'Selecionar cliente...'}, ...clients.map(c => ({ value: c.id, label: c.fullName }))]} placeholder="Ou preencha o nome abaixo" />
                    <Input label="Nome do Cliente (Manual/Novo)" id="customerNameManual" name="customerNameManual" value={formData.customerNameManual} onChange={handleChange} disabled={!!formData.clientId} placeholder={formData.clientId ? "Cliente selecionado acima" : "Nome completo do novo cliente"} />
                </div>
                 {selectedClientDetails?.isDefaulter && ( <Alert type="warning" message={`Atenção: Cliente ${selectedClientDetails.fullName} está marcado como inadimplente.`} details={selectedClientDetails.defaulterNotes} className="mt-2"/> )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"> <Input label="Produto (ex: iPhone)" id="productName" name="productName" value={formData.productName} onChange={handleChange} required /> <Input label="Modelo (ex: 15 Pro Max)" id="model" name="model" value={formData.model} onChange={handleChange} required /> </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"> <Input label="Capacidade (ex: 256GB)" id="capacity" name="capacity" value={formData.capacity} onChange={handleChange} /> <Input label="Cor" id="color" name="color" value={formData.color} onChange={handleChange} /> <Select label="Condição" id="condition" name="condition" value={formData.condition} onChange={handleChange} options={PRODUCT_CONDITION_OPTIONS.map(c => ({ value: c, label: c }))} /> </div>
            </Card>
            <Card title="Valores, Fornecedor e Prazos" className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Select label="Fornecedor" id="supplierId" name="supplierId" value={formData.supplierId || ''} onChange={handleChange} options={supplierOptions} /> {formData.supplierId && suppliers.find(s=>s.id === formData.supplierId)?.phone && ( <Button type="button" variant="ghost" size="sm" onClick={handleWhatsAppConsult} className="mt-6" leftIcon={<WhatsAppIcon className="h-5 w-5 text-green-500" />}> Consultar Fornecedor </Button> )} </div>
                <Input label="Valor Pago (R$)" id="purchasePrice" name="purchasePrice" type="number" step="0.01" value={String(formData.purchasePrice || '')} onChange={handleChange} required containerClassName="mt-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"> <Input label="Valor de Venda (R$) (Opcional)" id="sellingPrice" name="sellingPrice" type="number" step="0.01" value={String(formData.sellingPrice || '')} onChange={handleChange} /> <Select label="Status Inicial" id="status" name="status" value={formData.status} onChange={handleChange} options={ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))} /> <Input label="Data do Pedido" id="orderDate" name="orderDate" type="date" value={formData.orderDate} onChange={handleChange} required /> </div>
                <Input label="Prazo Estimado de Entrega" id="estimatedDeliveryDate" name="estimatedDeliveryDate" type="date" value={formData.estimatedDeliveryDate || ''} onChange={handleChange} containerClassName="mt-4" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"> <Input label="Custo Frete Fornecedor → Blu (R$)" id="shippingCostSupplierToBlu" name="shippingCostSupplierToBlu" type="number" step="0.01" value={String(formData.shippingCostSupplierToBlu || '')} onChange={handleChange} /> <Input label="Custo Frete Blu → Cliente (R$)" id="shippingCostBluToClient" name="shippingCostBluToClient" type="number" step="0.01" value={String(formData.shippingCostBluToClient || '')} onChange={handleChange} /> </div>
            </Card>
        </div>
        <Card title="Forma de Pagamento">
            <Select label="Forma de Pagamento" id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} options={PAYMENT_METHOD_OPTIONS.map(p => ({value: p, label: p}))} />
            {formData.paymentMethod === PaymentMethod.BLU_FACILITA && (
                <div className="mt-4 p-4 border border-blue-200 rounded-md bg-blue-50 space-y-3">
                    <h4 className="font-semibold text-blue-700">Simulação BluFacilita (Base: {formatCurrencyBRL(bfProductValueForSim)})</h4>
                     <div className="flex items-center space-x-2"> <input type="checkbox" id="bluFacilitaUsesSpecialRate" name="bluFacilitaUsesSpecialRate" checked={formData.bluFacilitaUsesSpecialRate} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500"/> <label htmlFor="bluFacilitaUsesSpecialRate" className="text-sm text-gray-700">Usar Taxa Especial BluFacilita?</label> </div>
                    {formData.bluFacilitaUsesSpecialRate && ( <Input label="Taxa Anual Especial (%)" id="bluFacilitaSpecialAnnualRate" name="bluFacilitaSpecialAnnualRate" type="number" step="0.01" value={String(formData.bluFacilitaSpecialAnnualRate || '')} onChange={handleChange} placeholder={`Padrão ${DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE * 100}%`} /> )}
                    <Input label="Entrada (R$)" id="bfDownPaymentInput" name="bfDownPaymentInput" value={bfDownPaymentInput} onChange={handleBfDownPaymentChange} onBlur={handleBfDownPaymentBlur} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Select label="Nº de Parcelas" id="installments" name="installments" value={String(formData.installments || 12)} onChange={handleChange} options={Array.from({length:12}, (_,i)=>({value:i+1, label:`${i+1}x`}))} /> </div>
                    <p className="text-sm"><strong>Valor Financiado:</strong> {formatCurrencyBRL(formData.financedAmount)}</p>
                    <p className="text-sm"><strong>Valor da Parcela:</strong> {formatCurrencyBRL(formData.installmentValue)}</p>
                    <p className="text-sm"><strong>Total com Juros (Financiamento + Entrada):</strong> {formatCurrencyBRL((formData.totalWithInterest || 0) + (formData.downPayment || 0))}</p>
                    <Select label="Status do Contrato BluFacilita" id="bluFacilitaContractStatus" name="bluFacilitaContractStatus" value={formData.bluFacilitaContractStatus} onChange={handleChange} options={BLU_FACILITA_CONTRACT_STATUS_OPTIONS.map(s => ({value:s, label:s}))} />
                </div>
            )}
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Notas e Documentos">
                <Textarea label="Observações Gerais da Encomenda" id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} />
                <div className="mt-4"> <h4 className="text-sm font-medium text-gray-700 mb-1">Documentos Anexados</h4> {documents.length === 0 && <p className="text-xs text-gray-500">Nenhum documento.</p>} <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto"> {documents.map(doc => ( <li key={doc.id} className="text-sm text-gray-600 flex justify-between items-center"> <span>{doc.name} ({formatDateBR(doc.uploadedAt)})</span> <Button type="button" variant="link" size="sm" onClick={() => handleRemoveDocument(doc.id)} className="text-red-500">Remover</Button> </li> ))} </ul> <Button type="button" variant="ghost" size="sm" onClick={handleAddDocument} className="mt-2"> <i className="heroicons-outline-paper-clip mr-1 h-4 w-4"></i>Adicionar Documento (mock) </Button> </div>
                 <div className="mt-4"> <Button type="button" variant="ghost" size="sm" onClick={generateNotaFiscalDescription} leftIcon={<DocumentTextIcon className="h-4 w-4"/>} className="mt-2">Gerar Descrição p/ Nota Fiscal</Button> </div>
            </Card>
            <Card title="Comunicação e Histórico Interno">
                 <Textarea label="Resumo do Histórico do WhatsApp (Opcional)" id="whatsAppHistorySummary" name="whatsAppHistorySummary" value={formData.whatsAppHistorySummary || ''} onChange={handleChange} rows={3} placeholder="Ex: Cliente aceitou seminovo se bateria > 85%..." />
                <div className="mt-4"> <h4 className="text-sm font-medium text-gray-700 mb-1">Notas Internas (Não visível ao cliente)</h4> <div className="max-h-32 overflow-y-auto mb-2 border rounded-md p-2 bg-gray-50 space-y-1"> {internalNotes.length === 0 && <p className="text-xs text-gray-500">Nenhuma nota interna.</p>} {internalNotes.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => ( <div key={note.id} className="text-xs text-gray-600 bg-white p-1.5 rounded shadow-sm"> <div className="flex justify-between items-center"> <span className="font-semibold">{formatDateBR(note.date, true)}</span> <Button type="button" variant="link" size="sm" onClick={() => handleRemoveInternalNote(note.id)} className="text-red-400 hover:text-red-600 p-0 leading-none">X</Button> </div> <p className="whitespace-pre-wrap">{note.note}</p> </div> ))} </div> <div className="flex items-center space-x-2"> <Textarea id="currentInternalNote" value={currentInternalNote} onChange={(e) => setCurrentInternalNote(e.target.value)} rows={2} placeholder="Adicionar nova nota interna..." textareaClassName="text-sm" /> <Button type="button" variant="secondary" size="sm" onClick={handleAddInternalNote} title="Adicionar Nota" className="self-end h-10"> <PlusIcon className="h-4 w-4"/> </Button> </div> </div>
            </Card>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t mt-6"> <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button> <Button type="submit" isLoading={isLoading} disabled={isLoading}> {initialOrder ? 'Salvar Alterações' : 'Adicionar Encomenda'} </Button> </div>
      </form>
    </Modal>
  );
};

interface RegisterArrivalModalProps { order: Order; isOpen: boolean; onClose: () => void; onSave: (updatedOrder: Order) => Promise<void>; }
const RegisterArrivalModal: React.FC<RegisterArrivalModalProps> = ({ order, isOpen, onClose, onSave }) => {
    const [arrivalData, setArrivalData] = useState({ arrivalDate: order.arrivalDate ? new Date(order.arrivalDate + "T00:00:00").toISOString().split('T')[0] : new Date().toISOString().split('T')[0], imei: order.imei || '', arrivalNotes: order.arrivalNotes || '', batteryHealth: order.batteryHealth || undefined, readyForDelivery: order.readyForDelivery || false, });
    const [arrivalPhotos, setArrivalPhotos] = useState<DocumentFile[]>(order.arrivalPhotos || []);
    const [isLoading, setIsLoading] = useState(false);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value, type } = e.target; if (type === 'checkbox') { setArrivalData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked })); } else if (name === "batteryHealth"){ setArrivalData(prev => ({...prev, batteryHealth: parseInt(value, 10) || undefined}))} else { setArrivalData(prev => ({ ...prev, [name]: value })); } };
    const handleAddPhoto = () => alert("Funcionalidade de upload de fotos não implementada (mock).");
    const handleSubmit = async () => { setIsLoading(true); const updatedOrder: Order = { ...order, ...arrivalData, arrivalPhotos, status: arrivalData.readyForDelivery ? OrderStatus.PRONTO_PARA_ENTREGA : order.status, trackingHistory: arrivalData.readyForDelivery && order.status !== OrderStatus.PRONTO_PARA_ENTREGA ? [...(order.trackingHistory || []), {status: OrderStatus.PRONTO_PARA_ENTREGA, date: new Date().toISOString(), notes: "Produto recebido e pronto"}] : order.trackingHistory, }; await onSave(updatedOrder); setIsLoading(false); onClose(); };
    return ( <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Chegada: ${order.productName} ${order.model}`} size="lg"> <div className="space-y-4"> <Input id="arrivalDate" label="Data de Chegada" type="date" name="arrivalDate" value={arrivalData.arrivalDate} onChange={handleChange} required /> <Input id="imei" label="IMEI do Aparelho" name="imei" value={arrivalData.imei} onChange={handleChange} placeholder="Se aplicável" /> {(order.condition === ProductCondition.SEMINOVO || order.condition === ProductCondition.USADO_BOM || order.condition === ProductCondition.USADO_EXCELENTE) && ( <Input id="batteryHealth" label="Saúde da Bateria (%)" type="number" name="batteryHealth" min="0" max="100" value={String(arrivalData.batteryHealth || '')} onChange={handleChange} /> )} <Textarea id="arrivalNotes" label="Observações da Chegada" name="arrivalNotes" value={arrivalData.arrivalNotes} onChange={handleChange} rows={3} /> <div> <label className="block text-sm font-medium text-gray-700 mb-1">Fotos do Produto (até 5 - mock)</label> {arrivalPhotos.map(p => <span key={p.id} className="text-xs bg-gray-100 p-1 rounded mr-1">{p.name}</span>)} <Button onClick={handleAddPhoto} size="sm" variant="ghost" className="mt-1">Adicionar Foto</Button> </div> <div className="flex items-center"> <input type="checkbox" id="readyForDelivery" name="readyForDelivery" checked={arrivalData.readyForDelivery} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /> <label htmlFor="readyForDelivery" className="ml-2 block text-sm text-gray-900">Marcar como PRONTO PARA ENTREGA</label> </div> <div className="flex justify-end space-x-2 pt-3"> <Button variant="secondary" onClick={onClose}>Cancelar</Button> <Button onClick={handleSubmit} isLoading={isLoading}>Salvar Chegada</Button> </div> </div> </Modal> );
};

export const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [orderToRegisterArrival, setOrderToRegisterArrival] = useState<Order | null>(null);
  const [orderToToggleImeiLock, setOrderToToggleImeiLock] = useState<Order | null>(null);
  const [orderToRegisterPayment, setOrderToRegisterPayment] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const location = useLocation(); const navigate = useNavigate();
  const [supplierNameVisible, setSupplierNameVisible] = useState(false);
  const [purchasePriceVisible, setPurchasePriceVisible] = useState(false);
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);


  const fetchAllData = useCallback(async () => { 
    setIsLoading(true); 
    try {
        setOrders(await getOrders()); 
        setClients(await getClients()); 
    } catch(e) {
        console.error("Failed to fetch orders/clients", e);
    }
    setIsLoading(false); 
  }, []);
  
  useEffect(() => {
    fetchAllData();
    const state = location.state as { prefillOrderData?: OrderFormPrefillData } | null;
    if (state?.prefillOrderData) {
      setEditingOrder(null); 
      setIsFormOpen(true); 
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [fetchAllData, location, navigate]);
  
  useEffect(() => { 
    const params = new URLSearchParams(location.search); 
    const viewOrderId = params.get('viewOrderId'); 
    const loadOrderDetails = async (id: string) => {
        const orderFromParam = await getOrderByIdService(id); 
        if (orderFromParam) { 
            setOrderToView(orderFromParam); 
            setSupplierNameVisible(false); 
            setPurchasePriceVisible(false); 
            setClientPayments(await getClientPaymentsByOrderId(orderFromParam.id)); 
        }
    };
    if (viewOrderId && orders.length > 0) { 
      loadOrderDetails(viewOrderId);
    }
  }, [location.search, orders]); // Removed navigate from dependency array as it's stable
  
  const handleSaveOrder = async (order: Order) => { 
    await saveOrder(order); 
    await fetchAllData(); 
    setIsFormOpen(false); 
    setEditingOrder(null); 
    if(orderToRegisterArrival?.id === order.id) setOrderToRegisterArrival(null); 
    if(orderToToggleImeiLock?.id === order.id) setOrderToToggleImeiLock(null); 
    if(orderToView?.id === order.id) { 
        const updatedOrder = await getOrderByIdService(order.id); 
        if(updatedOrder) setOrderToView(updatedOrder); 
        setClientPayments(await getClientPaymentsByOrderId(order.id));
    } 
    if(orderToRegisterPayment?.id === order.id) setOrderToRegisterPayment(null); 
  };

  const handleOpenForm = (order?: Order) => { setEditingOrder(order || null); setIsFormOpen(true); };
  
  const handleDeleteOrder = async (orderId: string) => { 
    if (window.confirm('Tem certeza que deseja excluir esta encomenda?')) { 
        await deleteOrder(orderId); 
        await fetchAllData(); 
        if (orderToView?.id === orderId) setOrderToView(null); 
    } 
  };
  
  const getClientName = useCallback((clientId?: string): string => {
    if (!clientId) return 'N/A';
    const client = clients.find(c => c.id === clientId);
    return client?.fullName || 'Carregando...';
  }, [clients]);
  
  const getSupplierName = useCallback(async (supplierId?: string): Promise<string> => { 
      if (!supplierId) return 'N/A'; 
      const supplier = await getSupplierById(supplierId); 
      return supplier?.name || 'Desconhecido'; 
  }, []);

  const filteredOrders = useMemo(() => { return orders.filter(order => { const term = searchTerm.toLowerCase(); const client = order.clientId ? clients.find(c => c.id === order.clientId) : null; const clientName = client?.fullName.toLowerCase() || order.customerName.toLowerCase(); const clientCpf = client?.cpfOrCnpj || ''; const matchesSearchTerm = clientName.includes(term) || clientCpf.includes(term) || order.productName.toLowerCase().includes(term) || order.model.toLowerCase().includes(term) || (order.id && order.id.toLowerCase().includes(term)) || (order.imei && order.imei.toLowerCase().includes(term)); const matchesStatus = statusFilter ? order.status === statusFilter : true; const matchesPayment = paymentMethodFilter ? order.paymentMethod === paymentMethodFilter : true; return matchesSearchTerm && matchesStatus && matchesPayment; }); }, [orders, clients, searchTerm, statusFilter, paymentMethodFilter]);
  
  const handleToggleImeiLockAction = (order: Order) => { setOrderToToggleImeiLock(order); };
  
  const confirmToggleImeiLock = async () => { 
    if(orderToToggleImeiLock){ 
        const updatedOrder = { ...orderToToggleImeiLock, imeiBlocked: !orderToToggleImeiLock.imeiBlocked }; 
        await handleSaveOrder(updatedOrder); 
    } 
  };

  const handleClearFilters = () => { setSearchTerm(''); setStatusFilter(''); setPaymentMethodFilter(''); };
  
  const handlePaymentSaved = async () => { 
    await fetchAllData(); 
    if(orderToView) { 
      const updatedOrder = await getOrderByIdService(orderToView.id);
      if (updatedOrder) setOrderToView(updatedOrder);
      setClientPayments(await getClientPaymentsByOrderId(orderToView.id)); 
    } 
    setOrderToRegisterPayment(null); 
  };

  const columns = [ 
    { header: 'Cliente', accessor: (item: Order): ReactNode => item.clientId ? getClientName(item.clientId) : item.customerName, className: 'font-medium' }, 
    { header: 'Produto', accessor: (item: Order): ReactNode => `${item.productName} ${item.model}`}, 
    { header: 'Fornecedor', accessor: (item: Order): ReactNode => item.supplierName || 'N/A'},
    { header: 'Status', accessor: (item: Order): ReactNode => ( <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${ item.status === OrderStatus.ENTREGUE ? 'bg-green-100 text-green-800' : item.status === OrderStatus.PRONTO_PARA_ENTREGA ? 'bg-teal-100 text-teal-800' : item.status === OrderStatus.CANCELADO ? 'bg-red-100 text-red-800' : item.status.includes('AGUARDANDO') || item.status.includes('PROCESSAMENTO') || item.status.includes('ADUANEIRO') ? 'bg-yellow-100 text-yellow-800' : item.paymentMethod === PaymentMethod.BLU_FACILITA && item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800' }`}> {item.status} {item.paymentMethod === PaymentMethod.BLU_FACILITA && item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO && "(Atraso)"} </span> )}, 
    { header: 'Pagamento', accessor: 'paymentMethod' as keyof Order}, 
    { header: 'Prazo/Chegada', accessor: (item: Order): ReactNode => item.arrivalDate ? <span className="text-gray-700">Chegou: {formatDateBR(item.arrivalDate)}</span> : <CountdownDisplay targetDate={item.estimatedDeliveryDate} /> }, 
    { header: 'Ações', accessor: (item: Order): ReactNode => ( <div className="flex flex-wrap items-center space-x-1"> <Button variant="ghost" size="sm" onClick={async (e) => { e.stopPropagation(); setOrderToView(item); setSupplierNameVisible(false); setPurchasePriceVisible(false); setClientPayments(await getClientPaymentsByOrderId(item.id)); }} title="Ver Detalhes"><i className="heroicons-outline-eye h-4 w-4"></i></Button> <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenForm(item);}} title="Editar"><i className="heroicons-outline-pencil-square h-4 w-4"></i></Button> <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setOrderToRegisterArrival(item);}} title="Registrar Chegada"><i className="heroicons-outline-archive-box-arrow-down h-4 w-4"></i></Button> {item.paymentMethod === PaymentMethod.BLU_FACILITA && item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO && item.imei && ( <Button variant={item.imeiBlocked ? "secondary" : "danger"} size="sm" onClick={(e) => { e.stopPropagation(); handleToggleImeiLockAction(item);}} title={item.imeiBlocked ? "Desbloquear IMEI" : "Bloquear IMEI"} > {item.imeiBlocked ? <LockOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />} </Button> )} <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={async (e) => { e.stopPropagation(); await handleDeleteOrder(item.id);}} title="Excluir"><i className="heroicons-outline-trash h-4 w-4"></i></Button> </div> )}, 
  ];
  
  const handleExport = async () => { 
      const dataToExport = await Promise.all(filteredOrders.map(async o => ({ 
          ID: o.id, 
          Cliente: o.clientId ? getClientName(o.clientId) : o.customerName, 
          Produto: `${o.productName} ${o.model} ${o.capacity} ${o.color}`, 
          Condicao: o.condition, 
          Fornecedor: o.supplierName || (o.supplierId ? await getSupplierName(o.supplierId) : 'N/A'), 
          ValorCompra_BRL: o.purchasePrice, 
          ValorVenda_BRL: o.sellingPrice, 
          Status: o.status, 
          DataPedido: formatDateBR(o.orderDate), 
          PrazoEntrega: formatDateBR(o.estimatedDeliveryDate), 
          DataChegada: formatDateBR(o.arrivalDate), 
          Pagamento: o.paymentMethod, 
          IMEI: o.imei, 
          Notas: o.notes, 
          ResumoWhatsApp: o.whatsAppHistorySummary, 
          FreteFornecedor: o.shippingCostSupplierToBlu, 
          FreteCliente: o.shippingCostBluToClient, 
          BF_TaxaEspecial: o.bluFacilitaUsesSpecialRate, 
          BF_TaxaAnual: o.bluFacilitaSpecialAnnualRate, 
          BF_Installments: o.bluFacilitaInstallments?.map(i => `P${i.installmentNumber}:${i.status}, V:${i.amountPaid||0}/${i.amount}`).join('; ') 
      }))); 
      exportToCSV(dataToExport, `encomendas_blu_imports_${new Date().toISOString().split('T')[0]}.csv`); 
  };
  
  return ( 
    <div> 
        <PageTitle title="Gerenciamento de Encomendas" subtitle="Adicione, visualize e gerencie todas as encomendas de clientes." actions={ <div className="flex space-x-2"> <Button onClick={handleExport} variant="secondary" leftIcon={<i className="heroicons-outline-arrow-down-tray h-5 w-5"></i>}>Exportar CSV</Button> <Button onClick={() => handleOpenForm()} leftIcon={<i className="heroicons-outline-plus-circle h-5 w-5"></i>}>Nova Encomenda</Button> </div> } /> 
        <Card className="mb-6"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"> <Input id="searchOrders" placeholder="Buscar por cliente, produto, IMEI..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} inputClassName="h-10" containerClassName="lg:col-span-2" /> <Select id="statusFilter" placeholder="Filtrar por status..." options={[{value: '', label: 'Todos os Status'}, ...ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} selectClassName="h-10" /> <Select id="paymentMethodFilter" placeholder="Filtrar por Pagamento..." options={[{value: '', label: 'Todas Formas Pgto.'}, ...PAYMENT_METHOD_OPTIONS.map(p => ({ value: p, label: p}))]} value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} selectClassName="h-10" /> </div> <div className="mt-4"> <Button onClick={handleClearFilters} variant="ghost" size="sm">Limpar Filtros</Button> </div> </Card> 
        <ResponsiveTable columns={columns} data={filteredOrders} isLoading={isLoading} emptyStateMessage="Nenhuma encomenda encontrada." onRowClick={async (item) => {setOrderToView(item); setSupplierNameVisible(false); setPurchasePriceVisible(false); setClientPayments(await getClientPaymentsByOrderId(item.id));}} rowKeyAccessor="id" /> 
      {isFormOpen && <OrderForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingOrder(null); }} onSave={handleSaveOrder} initialOrder={editingOrder} prefillData={(location.state as any)?.prefillOrderData as OrderFormPrefillData | undefined} />}
      {orderToView && (
        <Modal isOpen={!!orderToView} onClose={() => setOrderToView(null)} title={`Detalhes da Encomenda: ${orderToView.productName} ${orderToView.model}`} size="3xl">
            <div className="space-y-4 text-sm">
                <p className="text-gray-700"><strong>Cliente:</strong> {orderToView.clientId ? getClientName(orderToView.clientId) : orderToView.customerName}</p>
                <p className="text-gray-700"><strong>Produto:</strong> {orderToView.productName} {orderToView.model} ({orderToView.capacity}) - {orderToView.color} [{orderToView.condition}]</p>
                <div className="flex items-center text-gray-700"> <strong>Fornecedor:</strong>&nbsp; {supplierNameVisible ? (<span>{orderToView.supplierName || 'N/A'}</span>) : (<span className="blur-sm select-none">Fornecedor Protegido X</span>)} <Button variant="ghost" size="sm" onClick={() => setSupplierNameVisible(!supplierNameVisible)} className="ml-2 p-1"> {supplierNameVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />} </Button> </div>
                <div className="flex items-center text-gray-700"> <strong>Valor Pago (Fornecedor):</strong>&nbsp; {purchasePriceVisible ? (<span>{formatCurrencyBRL(orderToView.purchasePrice)}</span>) : (<span className="blur-sm select-none">{formatCurrencyBRL(orderToView.purchasePrice)}</span>)} <Button variant="ghost" size="sm" onClick={() => setPurchasePriceVisible(!purchasePriceVisible)} className="ml-2 p-1"> {purchasePriceVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />} </Button> </div>
                {orderToView.sellingPrice !== undefined && <p className="text-gray-700"><strong>Valor de Venda (Cliente):</strong> {formatCurrencyBRL(orderToView.sellingPrice)}</p>}
                <p className="text-gray-700"><strong>Forma de Pagamento:</strong> {orderToView.paymentMethod || 'N/A'}</p>
                {orderToView.paymentMethod === PaymentMethod.BLU_FACILITA && (
                    <div className="p-3 border-l-4 border-blue-500 bg-blue-50 text-gray-700 rounded-md">
                        <h4 className="font-semibold text-blue-700 mb-1">Detalhes BluFacilita</h4>
                        {orderToView.bluFacilitaUsesSpecialRate && <p><strong>Taxa:</strong> {orderToView.bluFacilitaSpecialAnnualRate?.toFixed(2)}% a.a. (Especial)</p>}
                        {!orderToView.bluFacilitaUsesSpecialRate && <p><strong>Taxa:</strong> {DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE * 100}% a.a. (Padrão)</p>}
                        <p><strong>Entrada:</strong> {formatCurrencyBRL(orderToView.downPayment)}</p>
                        <p><strong>Valor Financiado:</strong> {formatCurrencyBRL(orderToView.financedAmount)}</p>
                        <p><strong>Total com Juros (Financiado):</strong> {formatCurrencyBRL(orderToView.totalWithInterest)}</p>
                        <p><strong>Nº de Parcelas:</strong> {orderToView.installments || 'N/A'}</p>
                        <p><strong>Valor da Parcela:</strong> {formatCurrencyBRL(orderToView.installmentValue)}</p>
                        <p><strong>Status Contrato:</strong> <span className={`font-medium ${orderToView.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO ? 'text-red-600' : orderToView.bluFacilitaContractStatus === BluFacilitaContractStatus.EM_DIA ? 'text-green-600' : 'text-gray-700'}`}>{orderToView.bluFacilitaContractStatus || 'N/A'}</span></p>
                        {orderToView.imeiBlocked && <p className="text-red-600 font-semibold">IMEI BLOQUEADO INTERNAMENTE</p>}
                        {orderToView.imei && orderToView.paymentMethod === PaymentMethod.BLU_FACILITA && orderToView.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO && ( <Button variant={orderToView.imeiBlocked ? "secondary" : "danger"} size="sm" className="mt-2" onClick={() => handleToggleImeiLockAction(orderToView)} > {orderToView.imeiBlocked ? <LockOpenIcon className="h-4 w-4 mr-1" /> : <LockClosedIcon className="h-4 w-4 mr-1" />} {orderToView.imeiBlocked ? "Desbloquear IMEI" : "Bloquear IMEI"} </Button> )}
                        {orderToView.bluFacilitaInstallments && orderToView.bluFacilitaInstallments.length > 0 && (
                            <details className="mt-2 text-xs"><summary className="cursor-pointer text-blue-600 hover:underline">Ver Parcelas Detalhadas</summary>
                                <ul className="list-disc pl-5 mt-1 space-y-0.5"> {orderToView.bluFacilitaInstallments.map(inst => ( <li key={inst.installmentNumber}> Parcela {inst.installmentNumber}: {formatCurrencyBRL(inst.amount)} (Venc: {formatDateBR(inst.dueDate)}) - Status: {inst.status} {inst.amountPaid ? `(Pago ${formatCurrencyBRL(inst.amountPaid)} em ${formatDateBR(inst.paymentDate)})` : ''} </li> ))} </ul>
                            </details>
                        )}
                    </div>
                )}
                <p className="text-gray-700"><strong>Data do Pedido:</strong> {formatDateBR(orderToView.orderDate)}</p>
                <p className="text-gray-700"><strong>Prazo Estimado:</strong> {formatDateBR(orderToView.estimatedDeliveryDate)} (<CountdownDisplay targetDate={orderToView.estimatedDeliveryDate} />)</p>
                {orderToView.arrivalDate && <p className="text-gray-700"><strong>Data de Chegada:</strong> {formatDateBR(orderToView.arrivalDate)}</p>}
                {orderToView.imei && <p className="text-gray-700"><strong>IMEI:</strong> {orderToView.imei}</p>}
                {orderToView.batteryHealth !== undefined && <p className="text-gray-700"><strong>Saúde da Bateria:</strong> {orderToView.batteryHealth}%</p>}
                {orderToView.readyForDelivery && <p className="font-semibold text-green-600">Produto pronto para entrega!</p>}
                {orderToView.shippingCostSupplierToBlu !== undefined && <p className="text-gray-700"><strong>Custo Frete (Fornecedor → Blu):</strong> {formatCurrencyBRL(orderToView.shippingCostSupplierToBlu)}</p>}
                {orderToView.shippingCostBluToClient !== undefined && <p className="text-gray-700"><strong>Custo Frete (Blu → Cliente):</strong> {formatCurrencyBRL(orderToView.shippingCostBluToClient)}</p>}
                {orderToView.notes && <p className="text-gray-700"><strong>Observações (Pedido):</strong> {orderToView.notes}</p>}
                {orderToView.arrivalNotes && <p className="text-gray-700"><strong>Observações (Chegada):</strong> {orderToView.arrivalNotes}</p>}
                {orderToView.whatsAppHistorySummary && <p className="text-gray-700"><strong>Resumo WhatsApp:</strong> {orderToView.whatsAppHistorySummary}</p>}
                {orderToView.internalNotes && orderToView.internalNotes.length > 0 && ( <div><h4 className="text-md font-semibold mb-1 text-gray-800">Notas Internas:</h4> <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border"> {orderToView.internalNotes.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => ( <div key={note.id} className="mb-1.5 pb-1.5 border-b border-gray-200 last:border-b-0"> <p className="text-xs text-gray-500">{formatDateBR(note.date, true)}</p> <p className="whitespace-pre-wrap">{note.note}</p> </div> ))} </div> </div> )}
                
                <div> <h4 className="text-md font-semibold mb-1 text-gray-800">Pagamentos Recebidos:</h4>
                    {clientPayments.length > 0 ? (
                        <ul className="list-disc pl-5 text-xs bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                            {clientPayments.map(p => (
                                <li key={p.id}>
                                    {formatDateBR(p.paymentDate)}: {formatCurrencyBRL(p.amountPaid)} ({p.paymentMethodUsed})
                                    {p.notes && <span className="text-gray-500"> - {p.notes}</span>}
                                </li>
                            ))}
                        </ul>
                    ) : <span className="text-xs text-gray-500">Nenhum pagamento registrado para esta encomenda.</span>}
                     <Button variant="ghost" size="sm" onClick={() => setOrderToRegisterPayment(orderToView)} leftIcon={<CreditCardIcon className="h-4 w-4"/>} className="mt-1">
                        Registrar Recebimento
                    </Button>
                </div>
                
                <div><h4 className="text-md font-semibold mb-1 text-gray-800">Documentos:</h4> {orderToView.documents.length > 0 ? orderToView.documents.map(d => <span key={d.id} className="text-xs bg-gray-100 p-1 rounded mr-1">{d.name}</span>) : <span className="text-xs text-gray-500">Nenhum.</span>}</div>
                <div><h4 className="text-md font-semibold mb-1 text-gray-800">Linha do Tempo:</h4><OrderStatusTimeline order={orderToView} /></div>
                 <div className="flex justify-end space-x-2 mt-6"> <Button variant="secondary" onClick={() => { setOrderToView(null); handleOpenForm(orderToView); }}>Editar Encomenda</Button> <Button onClick={() => setOrderToView(null)}>Fechar</Button> </div>
            </div>
        </Modal>
      )}
      {orderToRegisterArrival && ( <RegisterArrivalModal order={orderToRegisterArrival} isOpen={!!orderToRegisterArrival} onClose={() => setOrderToRegisterArrival(null)} onSave={handleSaveOrder} /> )}
      {orderToToggleImeiLock && ( <Modal isOpen={!!orderToToggleImeiLock} onClose={() => setOrderToToggleImeiLock(null)} title={`${orderToToggleImeiLock.imeiBlocked ? 'Confirmar Desbloqueio' : 'Confirmar Bloqueio'} de IMEI`} size="md" footer={ <> <Button variant="secondary" onClick={() => setOrderToToggleImeiLock(null)}>Cancelar</Button> <Button variant={orderToToggleImeiLock.imeiBlocked ? "primary" : "danger"} onClick={confirmToggleImeiLock}> {orderToToggleImeiLock.imeiBlocked ? 'Sim, Desbloquear' : 'Sim, Bloquear'} </Button> </> } > <p className="text-gray-700"> Tem certeza que deseja <strong>{orderToToggleImeiLock.imeiBlocked ? 'desbloquear' : 'bloquear'}</strong> o IMEI <span className="font-semibold"> {orderToToggleImeiLock.imei}</span> para o pedido de <span className="font-semibold">{orderToToggleImeiLock.clientId ? getClientName(orderToToggleImeiLock.clientId) : orderToToggleImeiLock.customerName}</span>? </p> <p className="text-sm text-gray-600 mt-2"> Esta ação é para controle interno e não realiza bloqueio/desbloqueio real na operadora. </p> </Modal> )}
      {orderToRegisterPayment && ( <RegisterPaymentModal order={orderToRegisterPayment} isOpen={!!orderToRegisterPayment} onClose={() => setOrderToRegisterPayment(null)} onPaymentSaved={handlePaymentSaved} /> )}
    </div>
  );
};