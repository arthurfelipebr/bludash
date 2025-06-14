import React, { useState, useEffect, useCallback, useMemo, ReactNode, ChangeEvent, useReducer } from 'react';
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
  sendOrderContractToAutentique,
} from '../services/AppService';
import { Button, Modal, Input, Select, Textarea, Card, PageTitle, Alert, ResponsiveTable, Spinner, WhatsAppIcon, ClipboardDocumentIcon, Stepper, Toast, OrderProgressBar } from '../components/SharedComponents';
import { ClientForm } from './ClientsFeature';
import { v4 as uuidv4 } from 'uuid';
import { EyeIcon, EyeSlashIcon, RegisterPaymentModal } from '../App';
import { Eye, Pencil, ArchiveRestore, Trash2, Download, PlusCircle } from 'lucide-react';
import ClientProductStep from './orders/steps/ClientProductStep';
import ValuesStep from './orders/steps/ValuesStep';
import NotesDocsStep from './orders/steps/NotesDocsStep';


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

const getDeliveryDate = (order: Order): string | undefined => {
  const entry = order.trackingHistory?.find(h => h.status === OrderStatus.ENTREGUE);
  return entry?.date;
};

const OrderStatusTimeline: React.FC<{ order: Order }> = ({ order }) => {
  const getStatusHistory = (status: OrderStatus) => order.trackingHistory?.find(h => h.status === status);
  
  const relevantStatuses = useMemo(() => {
    if ((order.status as OrderStatus) === OrderStatus.CANCELADO) {
        return [OrderStatus.PEDIDO_CRIADO, OrderStatus.CANCELADO];
    }
    const typicalPath: OrderStatus[] = [
        OrderStatus.PEDIDO_CRIADO,
        OrderStatus.PAGAMENTO_CONFIRMADO,
        OrderStatus.COMPRA_REALIZADA,
        OrderStatus.A_CAMINHO_DO_ESCRITORIO,
        OrderStatus.CHEGOU_NO_ESCRITORIO,
        OrderStatus.AGUARDANDO_RETIRADA,
        OrderStatus.ENVIADO,
        OrderStatus.ENTREGUE
    ];
    let displayStatusesSet = new Set<OrderStatus>();
    order.trackingHistory?.forEach(h => displayStatusesSet.add(h.status));
    displayStatusesSet.add(order.status);
    const currentIdxInTypical = typicalPath.indexOf(order.status);
    typicalPath.slice(0, currentIdxInTypical !== -1 ? currentIdxInTypical + 2 : typicalPath.length).forEach(s => displayStatusesSet.add(s));
    if (!displayStatusesSet.has(OrderStatus.ENVIADO) && order.status !== OrderStatus.CANCELADO) {
        displayStatusesSet.add(OrderStatus.ENVIADO);
    }
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

const PRODUCT_OPTIONS = ['iPhone', 'MacBook', 'iPad', 'Apple Watch', 'Mac Mini'];
const PRODUCT_MODELS: { [key: string]: string[] } = {
  'iPhone': ['15 Pro Max', '15 Pro', '15 Plus', '15', '14 Pro Max', '14 Pro', '14 Plus', '14', 'SE (3ª ger)', '13 Pro Max', '13 Pro', '13', '13 Mini', '12 Pro Max', '12 Pro', '12', '12 Mini', 'SE (2ª ger)'],
  'MacBook': ['Air 15" (M3)', 'Air 13" (M3)', 'Pro 14" (M3)', 'Pro 14" (M3 Pro/Max)', 'Pro 16" (M3 Pro/Max)', 'Air 15" (M2)', 'Pro 13" (M2)', 'Air (M2)', 'Pro 14" (M2 Pro/Max)', 'Pro 16" (M2 Pro/Max)', 'Air (M1)', 'Pro 13" (M1)'],
  'iPad': ['Pro 13" (M4)', 'Pro 11" (M4)', 'Air 13" (M2)', 'Air 11" (M2)', 'iPad (10ª ger)', 'Pro 12.9" (M2)', 'Pro 11" (M2)', 'Air (M1 - 5ª ger)', 'Mini (6ª ger)', 'iPad (9ª ger)', 'Pro 12.9" (M1)', 'Pro 11" (M1)'],
  'Apple Watch': ['Series 9', 'Ultra 2', 'SE (2ª ger)', 'Series 8', 'Ultra', 'Series 7', 'SE (1ª ger)', 'Series 6'],
  'Mac Mini': ['Mac Mini (M2)', 'Mac Mini (M2 Pro)', 'Mac Mini (M1)'],
};
const CAPACITY_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];

const initialFormData: Omit<Order, 'id' | 'documents' | 'trackingHistory' | 'customerName' | 'supplierName' | 'internalNotes' | 'bluFacilitaInstallments'> & { customerNameManual: string; deliveryDate?: string } = {
  clientId: undefined,
  customerNameManual: '', 
  productName: '', model: '', capacity: '', watchSize: '', color: '',
  condition: ProductCondition.LACRADO,
  supplierId: undefined,
  purchasePrice: 0, sellingPrice: undefined,
  status: OrderStatus.PEDIDO_CRIADO,
  estimatedDeliveryDate: '',
  orderDate: new Date().toISOString().split('T')[0], 
  notes: '',
  paymentMethod: PaymentMethod.A_VISTA,
  downPayment: 0, installments: 12, 
  financedAmount: 0, totalWithInterest: 0, installmentValue: 0,
  bluFacilitaContractStatus: BluFacilitaContractStatus.EM_DIA,
  imeiBlocked: false,
  arrivalDate: undefined, imei: undefined, arrivalPhotos: [], arrivalNotes: undefined, batteryHealth: undefined, readyForDelivery: false,
  deliveryDate: undefined,
  shippingCostSupplierToBlu: undefined, shippingCostBluToClient: undefined,
  whatsAppHistorySummary: undefined,
  bluFacilitaUsesSpecialRate: false, bluFacilitaSpecialAnnualRate: undefined,
};

type BaseFormData = typeof initialFormData;
export interface OrderFormState extends BaseFormData {
  currentStep: number;
}

export type OrderFormAction =
  | { type: 'UPDATE_FIELD'; field: keyof BaseFormData; value: any }
  | { type: 'SET_CLIENT'; client: Partial<Client> }
  | { type: 'SET_STATE_FROM_INITIAL'; data: OrderFormState }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' };

const orderFormReducer = (state: OrderFormState, action: OrderFormAction): OrderFormState => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value } as OrderFormState;
    case 'SET_CLIENT':
      return {
        ...state,
        clientId: action.client.id,
        customerNameManual: action.client.id ? '' : action.client.fullName ?? ''
      };
    case 'SET_STATE_FROM_INITIAL':
      return action.data;
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    default:
      return state;
  }
};

const initialState: OrderFormState = { ...initialFormData, currentStep: 0 };


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
  const [state, dispatch] = useReducer(orderFormReducer, initialState);
  const formData = state;
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [currentInternalNote, setCurrentInternalNote] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentStep = state.currentStep;

  const [bfProductValueForSim, setBfProductValueForSim] = useState(0);
  const [bfDownPaymentInput, setBfDownPaymentInput] = useState('R$ 0,00');
  const [isProductNFModalOpen, setIsProductNFModalOpen] = useState(false);
  const [productNFText, setProductNFText] = useState('');
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const FORM_STEPS = ['Cliente & Produto', 'Valores & Pagamento', 'Notas & Docs'];

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
            productName: initialOrder.productName, model: initialOrder.model, capacity: initialOrder.capacity, watchSize: initialOrder.watchSize || '', color: initialOrder.color,
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
            deliveryDate: (() => { const entry = initialOrder.trackingHistory?.find(h => h.status === OrderStatus.ENTREGUE); return entry ? new Date(entry.date).toISOString().split('T')[0] : undefined; })(),
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

        dispatch({ type: 'SET_STATE_FROM_INITIAL', data: { ...effectiveInitialData, currentStep: 0 } });
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
            dispatch({ type: 'UPDATE_FIELD', field: 'downPayment', value: downPaymentVal });
            dispatch({ type: 'UPDATE_FIELD', field: 'financedAmount', value: bfDetails.financedAmount });
            dispatch({ type: 'UPDATE_FIELD', field: 'totalWithInterest', value: bfDetails.totalWithInterest });
            dispatch({ type: 'UPDATE_FIELD', field: 'installmentValue', value: bfDetails.installmentValue });
        } else {
             dispatch({ type: 'UPDATE_FIELD', field: 'downPayment', value: downPaymentVal });
             dispatch({ type: 'UPDATE_FIELD', field: 'financedAmount', value: Math.max(0, productVal - downPaymentVal) });
             dispatch({ type: 'UPDATE_FIELD', field: 'totalWithInterest', value: Math.max(0, productVal - downPaymentVal) });
             dispatch({ type: 'UPDATE_FIELD', field: 'installmentValue', value: 0 });
        }
    }
  }, [formData.paymentMethod, formData.sellingPrice, formData.purchasePrice, bfDownPaymentInput, formData.installments, formData.bluFacilitaUsesSpecialRate, formData.bluFacilitaSpecialAnnualRate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "bluFacilitaUsesSpecialRate") {
        dispatch({ type: 'UPDATE_FIELD', field: 'bluFacilitaUsesSpecialRate', value: checked });
        if (!checked) dispatch({ type: 'UPDATE_FIELD', field: 'bluFacilitaSpecialAnnualRate', value: undefined });
    } else if (name === 'productName') {
        dispatch({ type: 'UPDATE_FIELD', field: 'productName', value });
        dispatch({ type: 'UPDATE_FIELD', field: 'model', value: '' });
        dispatch({ type: 'UPDATE_FIELD', field: 'watchSize', value: '' });
    } else if (["purchasePrice", "sellingPrice", "shippingCostSupplierToBlu", "shippingCostBluToClient", "bluFacilitaSpecialAnnualRate", "batteryHealth"].includes(name)) {
        const numericValue = parseFloat(value);
        dispatch({ type: 'UPDATE_FIELD', field: name as keyof BaseFormData, value: isNaN(numericValue) ? undefined : numericValue });
        if (name === "sellingPrice" || (name === "purchasePrice" && !formData.sellingPrice)) {
            setBfProductValueForSim(isNaN(numericValue) ? 0 : numericValue);
        }
    } else if (name === 'status') {
        dispatch({ type: 'UPDATE_FIELD', field: 'status', value });
        if (value === OrderStatus.ENTREGUE && !formData.deliveryDate) {
            dispatch({ type: 'UPDATE_FIELD', field: 'deliveryDate', value: new Date().toISOString().split('T')[0] });
        } else if (value !== OrderStatus.ENTREGUE) {
            dispatch({ type: 'UPDATE_FIELD', field: 'deliveryDate', value: undefined });
        }
    } else if (name === "supplierId" || name === "clientId") {
        dispatch({ type: 'UPDATE_FIELD', field: name as keyof BaseFormData, value: value || undefined });
    } else if (type === 'number' && name === 'installments') {
        dispatch({ type: 'UPDATE_FIELD', field: 'installments', value: parseInt(value, 10) || 1 });
    } else if (type === 'checkbox' && name === 'readyForDelivery') {
        dispatch({ type: 'UPDATE_FIELD', field: 'readyForDelivery', value: checked });
    } else {
      dispatch({ type: 'UPDATE_FIELD', field: name as keyof BaseFormData, value });
    }
  };

  const handleBfDownPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => setBfDownPaymentInput(e.target.value);
  const handleBfDownPaymentBlur = () => setBfDownPaymentInput(formatNumberToBRLCurrencyInput(parseBRLCurrencyStringToNumber(bfDownPaymentInput)));
  
  const handleAddInternalNote = () => { if (currentInternalNote.trim()) { setInternalNotes(prev => [...prev, { id: uuidv4(), date: new Date().toISOString(), note: currentInternalNote.trim() }]); setCurrentInternalNote(''); } };
  const handleRemoveInternalNote = (noteId: string) => setInternalNotes(prev => prev.filter(n => n.id !== noteId));
  const handleAddDocument = () => { const docName = prompt("Nome do documento (ex: Contrato, Invoice):"); if (docName) { setDocuments(prev => [...prev, { id: uuidv4(), name: docName, url: '#mocklink', uploadedAt: new Date().toISOString() }]); } };
  const handleRemoveDocument = (docId: string) => setDocuments(prev => prev.filter(doc => doc.id !== docId));

  const openNewClientForm = (name: string) => {
    setNewClientName(name);
    setIsClientFormOpen(true);
  };

  const handleSaveNewClient = async (client: Client) => {
    const saved = await saveClient(client);
    const updatedClients = await getClients();
    setClients(updatedClients);
    dispatch({ type: 'UPDATE_FIELD', field: 'clientId', value: saved.id });
    dispatch({ type: 'UPDATE_FIELD', field: 'customerNameManual', value: '' });
    setIsClientFormOpen(false);
    setNewClientName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setIsLoading(true);
    if ((!formData.clientId && !formData.customerNameManual) || !formData.productName || !formData.model) { setError("Cliente (existente ou manual), Produto e Modelo são obrigatórios."); setIsLoading(false); return; }
    if (formData.purchasePrice < 0) { setError("Custo não pode ser negativo."); setIsLoading(false); return; }
    if (formData.paymentMethod === PaymentMethod.BLU_FACILITA && (formData.sellingPrice || formData.purchasePrice || 0) <= 0) { setError("Valor do produto (venda ou compra) deve ser maior que zero para BluFacilita."); setIsLoading(false); return; }
    
    const selectedSupplierObj = formData.supplierId ? await getSupplierById(formData.supplierId) : null;
    const selectedClientObj = formData.clientId ? await getClientById(formData.clientId) : null;

    // If no existing client selected, create a minimal client record so it appears in the Clients tab
    let createdClient: Client | null = null;
    let finalClientId = formData.clientId;
    if (!finalClientId && formData.customerNameManual && !initialOrder) {
      try {
        createdClient = await saveClient({
          fullName: formData.customerNameManual,
          cpfOrCnpj: '',
          email: '',
          phone: '',
          address: '',
          cep: '',
          city: '',
          state: '',
          clientType: ClientType.PESSOA_FISICA,
          registrationDate: new Date().toISOString(),
          notes: '',
          isDefaulter: false,
          defaulterNotes: ''
        });
        finalClientId = createdClient.id;
      } catch (err) {
        console.error('Erro ao criar cliente automaticamente:', err);
      }
    }
    
    const { deliveryDate, ...formDataToSave } = formData;
    const orderToSave: Order = {
      ...formDataToSave,
      clientId: finalClientId,
      id: initialOrder?.id || uuidv4(),
      userId: initialOrder?.userId,
      customerName: finalClientId ? (selectedClientObj?.fullName || createdClient?.fullName || 'Cliente não encontrado') : formData.customerNameManual,
      supplierName: selectedSupplierObj?.name,
      estimatedDeliveryDate: formData.estimatedDeliveryDate || undefined,
      documents, internalNotes,
      trackingHistory: initialOrder?.trackingHistory || [{ status: formData.status, date: formData.status === OrderStatus.ENTREGUE && formData.deliveryDate ? new Date(formData.deliveryDate + 'T00:00:00').toISOString() : new Date().toISOString(), notes:"Pedido Criado" }],
      downPayment: formData.paymentMethod === PaymentMethod.BLU_FACILITA ? parseBRLCurrencyStringToNumber(bfDownPaymentInput) : undefined,
      installments: formData.paymentMethod === PaymentMethod.BLU_FACILITA ? formData.installments : undefined,
      bluFacilitaInstallments: initialOrder?.bluFacilitaInstallments, 
    };
    if (initialOrder && initialOrder.status !== formData.status) { const histDate = formData.status === OrderStatus.ENTREGUE && formData.deliveryDate ? new Date(formData.deliveryDate + 'T00:00:00').toISOString() : new Date().toISOString(); const newHistoryEntry = { status: formData.status, date: histDate, notes: "Status atualizado manualmente" }; orderToSave.trackingHistory = [...(initialOrder.trackingHistory || []), newHistoryEntry]; }
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
  navigator.clipboard.writeText(desc)
    .then(() => {
      alert("Descrição da Nota Fiscal copiada para a área de transferência!");
    })
    .catch(err => {
      console.error('Erro ao copiar descrição: ', err);
      alert('Erro ao copiar descrição. Veja o console.');
      const modal = document.createElement('div');
      modal.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;"><div style="background:white;padding:20px;border-radius:8px;max-width:500px;white-space:pre-wrap;"><h3>Descrição para Nota Fiscal:</h3><textarea rows="10" style="width:100%;margin-top:10px;" readonly>${desc}</textarea><button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px;">Fechar</button></div></div>`;
      document.body.appendChild(modal);
    });
  };

  const generateNotaFiscalProductInfo = () => {
    const clientName = selectedClientDetails?.fullName || formData.customerNameManual || 'NOME DO CLIENTE';
    const cpf = selectedClientDetails?.cpfOrCnpj || 'CPF';
    const city = selectedClientDetails?.city || 'CIDADE';
    const state = selectedClientDetails?.state || 'ESTADO';
    const modelo = formData.model || 'MODELO';
    const capacidade = formData.capacity || 'ARMAZENAMENTO';
    const tamanho = formData.watchSize || 'TAMANHO';
    const corProduto = formData.color || 'COR';
    const imei = formData.imei || 'IMEI';
    const valorPago = formData.purchasePrice ? formatCurrencyBRL(formData.purchasePrice) : 'CUSTO';
    const formaPgto = formData.paymentMethod || 'FORMA DE PAGAMENTO';

    const text = `Nome completo: ${clientName}\nCPF: ${cpf}\nCEP: [CEP]\nEndereço: [Endereço]\nNúmero: [Número]\nComplemento: [Complemento]\nBairro: [Bairro]\nCidade: ${city}\nEstado: ${state}\nModelo: ${modelo}\nTamanho: ${tamanho}\nArmazenamento: ${capacidade}\nCor: ${corProduto}\nIMEI (Se aplicável): ${imei}\nSN: [SN]\nCusto: ${valorPago}\nForma de Pagamento: ${formaPgto}`;
    setProductNFText(text);
    setIsProductNFModalOpen(true);
  };
  
  const selectedClientDetails = formData.clientId ? clients.find(c => c.id === formData.clientId) : null;


  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={initialOrder ? 'Editar Encomenda' : 'Adicionar Nova Encomenda'} size="3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        <Stepper steps={FORM_STEPS} currentStep={currentStep} />
        {currentStep === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientProductStep state={formData} dispatch={dispatch} onAddNewClient={openNewClientForm} />
        </div>)}
        {currentStep === 1 && (
          <ValuesStep
            state={formData}
            suppliers={suppliers}
            supplierOptions={supplierOptions}
            bfProductValueForSim={bfProductValueForSim}
            bfDownPaymentInput={bfDownPaymentInput}
            handleChange={handleChange}
            handleWhatsAppConsult={handleWhatsAppConsult}
            handleBfDownPaymentChange={handleBfDownPaymentChange}
            handleBfDownPaymentBlur={handleBfDownPaymentBlur}
          />
        )}
        {currentStep === 2 && (
          <NotesDocsStep
            state={formData}
            documents={documents}
            internalNotes={internalNotes}
            currentInternalNote={currentInternalNote}
            setCurrentInternalNote={setCurrentInternalNote}
            handleChange={handleChange}
            handleAddInternalNote={handleAddInternalNote}
            handleRemoveInternalNote={handleRemoveInternalNote}
            handleAddDocument={handleAddDocument}
            handleRemoveDocument={handleRemoveDocument}
            generateNotaFiscalDescription={generateNotaFiscalDescription}
            generateNotaFiscalProductInfo={generateNotaFiscalProductInfo}
          />
        )}

        <div className="flex justify-between pt-4 border-t mt-6">
            {currentStep > 0 && <Button type="button" variant="secondary" onClick={() => dispatch({ type: 'PREV_STEP' })} disabled={isLoading}>Voltar</Button>}
            <div className="flex space-x-3 ml-auto">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                {currentStep < FORM_STEPS.length - 1 ? (
                    <Button type="button" onClick={() => dispatch({ type: 'NEXT_STEP' })} disabled={isLoading}>Próximo</Button>
                ) : (
                    <Button type="submit" isLoading={isLoading} disabled={isLoading}>{initialOrder ? 'Salvar Alterações' : 'Adicionar Encomenda'}</Button>
                )}
            </div>
        </div>
      </form>
    </Modal>
    {isProductNFModalOpen && (
      <Modal
        isOpen={isProductNFModalOpen}
        onClose={() => setIsProductNFModalOpen(false)}
        title="Dados para Nota Fiscal do Produto"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsProductNFModalOpen(false)}>Fechar</Button>
            <Button onClick={() => navigator.clipboard.writeText(productNFText)}>Copiar Tudo</Button>
          </>
        }
      >
        <Textarea id="productNFText" value={productNFText} readOnly rows={productNFText.split('\n').length} textareaClassName="text-sm" />
      </Modal>
    )}
    {isClientFormOpen && (
      <ClientForm
        isOpen={isClientFormOpen}
        onClose={() => setIsClientFormOpen(false)}
        onSave={handleSaveNewClient}
        initialClient={newClientName ? { fullName: newClientName } as Client : undefined}
      />
    )}
  </>
  );
};

interface RegisterArrivalModalProps { order: Order; isOpen: boolean; onClose: () => void; onSave: (updatedOrder: Order) => Promise<void>; onArrivalRegistered?: (order: Order) => void; }
const RegisterArrivalModal: React.FC<RegisterArrivalModalProps> = ({ order, isOpen, onClose, onSave, onArrivalRegistered }) => {
    const [arrivalData, setArrivalData] = useState({ arrivalDate: order.arrivalDate ? new Date(order.arrivalDate + "T00:00:00").toISOString().split('T')[0] : new Date().toISOString().split('T')[0], imei: order.imei || '', arrivalNotes: order.arrivalNotes || '', batteryHealth: order.batteryHealth || undefined, readyForDelivery: order.readyForDelivery || false, });
    const [arrivalPhotos, setArrivalPhotos] = useState<DocumentFile[]>(order.arrivalPhotos || []);
    const [isLoading, setIsLoading] = useState(false);
    const [clientName, setClientName] = useState(order.customerName);
    useEffect(() => { if(order.clientId){ getClientById(order.clientId).then(c=> setClientName(c?.fullName || order.customerName)); } }, [order]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value, type } = e.target; if (type === 'checkbox') { setArrivalData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked })); } else if (name === "batteryHealth"){ setArrivalData(prev => ({...prev, batteryHealth: parseInt(value, 10) || undefined}))} else { setArrivalData(prev => ({ ...prev, [name]: value })); } };
    const handleAddPhoto = () => alert("Funcionalidade de upload de fotos não implementada (mock).");
    const handleSubmit = async () => { setIsLoading(true); const updatedOrder: Order = { ...order, ...arrivalData, arrivalPhotos, status: arrivalData.readyForDelivery ? OrderStatus.AGUARDANDO_RETIRADA : order.status, trackingHistory: arrivalData.readyForDelivery && order.status !== OrderStatus.AGUARDANDO_RETIRADA ? [...(order.trackingHistory || []), {status: OrderStatus.AGUARDANDO_RETIRADA, date: new Date().toISOString(), notes: "Produto recebido e pronto"}] : order.trackingHistory, }; await onSave(updatedOrder); setIsLoading(false); onClose(); onArrivalRegistered && onArrivalRegistered(updatedOrder); };
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
  const [toastData, setToastData] = useState<{message:string; action: () => void} | null>(null);


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

  const handleSendContract = async (order: Order) => {
    try {
      await sendOrderContractToAutentique(order.id);
      alert('Contrato enviado via Autentique.');
    } catch (err) {
      console.error('Erro ao enviar contrato', err);
      alert('Falha ao enviar contrato.');
    }
  };

  const columns = [
    { header: 'Cliente', accessor: (item: Order): ReactNode => item.clientId ? getClientName(item.clientId) : item.customerName, className: 'font-medium' },
    { header: 'Produto', accessor: (item: Order): ReactNode => `${item.productName} ${item.model}` },
    { header: 'Dados Financeiros (Fornecedor)', accessor: (item: Order): ReactNode => (
        <div className="leading-tight text-sm">
          <div>{item.supplierName || 'N/A'}</div>
          <div>{formatCurrencyBRL(item.purchasePrice)}</div>
        </div>
    )},
    { header: 'Status', accessor: (item: Order): ReactNode => (
      <span
        className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
          item.status === OrderStatus.ENTREGUE
            ? 'bg-green-200 text-green-800'
            : item.status === OrderStatus.ENVIADO
            ? 'bg-green-100 text-green-800'
            : item.status === OrderStatus.AGUARDANDO_RETIRADA
            ? 'bg-teal-100 text-teal-800'
            : item.status === OrderStatus.CANCELADO
            ? 'bg-red-100 text-red-800'
            : item.status.includes('Aguardando') || item.status.includes('Caminho')
            ? 'bg-yellow-100 text-yellow-800'
            : item.paymentMethod === PaymentMethod.BLU_FACILITA &&
              item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO
            ? 'bg-orange-100 text-orange-800'
            : 'bg-blue-100 text-blue-800'
        }`}
      >
        {item.status}{' '}
        {item.paymentMethod === PaymentMethod.BLU_FACILITA &&
          item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO &&
          '(Atraso)'}
      </span>
    )},
    { header: 'Progresso', accessor: (item: Order): ReactNode => (
        <div className="w-32">
          <OrderProgressBar status={item.status} />
        </div>
    )},
    { header: 'Pagamento', accessor: 'paymentMethod' as keyof Order },
    { header: 'Prazo/Chegada', accessor: (item: Order): ReactNode => {
        const delivered = getDeliveryDate(item);
        if (delivered) return <span className="text-gray-700">Entregue: {formatDateBR(delivered)}</span>;
        return item.arrivalDate ? <span className="text-gray-700">Chegou: {formatDateBR(item.arrivalDate)}</span> : <CountdownDisplay targetDate={item.estimatedDeliveryDate} />;
      } },
    { header: 'Ações', accessor: (item: Order): ReactNode => (
        <div className="flex flex-wrap items-center space-x-1">
            <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                    e.stopPropagation();
                    setOrderToView(item);
                    setSupplierNameVisible(false);
                    setPurchasePriceVisible(false);
                    setClientPayments(await getClientPaymentsByOrderId(item.id));
                }}
                title="Ver Detalhes"
            >
                <Eye className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpenForm(item);
                }}
                title="Editar"
            >
                <Pencil className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    setOrderToRegisterArrival(item);
                }}
                title="Registrar Chegada"
            >
                <ArchiveRestore className="h-4 w-4" />
            </Button>
            {item.paymentMethod === PaymentMethod.BLU_FACILITA && item.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO && item.imei && (
                <Button
                    variant={item.imeiBlocked ? "secondary" : "danger"}
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleImeiLockAction(item);
                    }}
                    title={item.imeiBlocked ? "Desbloquear IMEI" : "Bloquear IMEI"}
                >
                    {item.imeiBlocked ? <LockOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />}
                </Button>
            )}
            <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={async (e) => {
                    e.stopPropagation();
                    await handleDeleteOrder(item.id);
                }}
                title="Excluir"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )},
  ];
  
  const handleExport = async () => { 
      const dataToExport = await Promise.all(filteredOrders.map(async o => ({ 
          ID: o.id, 
          Cliente: o.clientId ? getClientName(o.clientId) : o.customerName, 
          Produto: `${o.productName} ${o.model} ${o.watchSize ? '(' + o.watchSize + ') ' : ''}${o.capacity} ${o.color}`,
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
        <PageTitle
            title="Gerenciamento de Encomendas"
            subtitle="Adicione, visualize e gerencie todas as encomendas de clientes."
            actions={
                <div className="flex space-x-2">
                    <Button onClick={handleExport} variant="secondary" leftIcon={<Download className="h-5 w-5" />}>Exportar CSV</Button>
                    <Button onClick={() => handleOpenForm()} leftIcon={<PlusCircle className="h-5 w-5" />}>Nova Encomenda</Button>
                </div>
            }
        />
        <Card className="mb-6"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"> <Input id="searchOrders" placeholder="Buscar por cliente, produto, IMEI..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} inputClassName="h-10" containerClassName="lg:col-span-2" /> <Select id="statusFilter" placeholder="Filtrar por status..." options={[{value: '', label: 'Todos os Status'}, ...ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))]} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} selectClassName="h-10" /> <Select id="paymentMethodFilter" placeholder="Filtrar por Pagamento..." options={[{value: '', label: 'Todas Formas Pgto.'}, ...PAYMENT_METHOD_OPTIONS.map(p => ({ value: p, label: p}))]} value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} selectClassName="h-10" /> </div> <div className="mt-4"> <Button onClick={handleClearFilters} variant="ghost" size="sm">Limpar Filtros</Button> </div> </Card> 
        <ResponsiveTable columns={columns} data={filteredOrders} isLoading={isLoading} emptyStateMessage="Nenhuma encomenda encontrada." onRowClick={async (item) => {setOrderToView(item); setSupplierNameVisible(false); setPurchasePriceVisible(false); setClientPayments(await getClientPaymentsByOrderId(item.id));}} rowKeyAccessor="id" /> 
      {isFormOpen && <OrderForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingOrder(null); }} onSave={handleSaveOrder} initialOrder={editingOrder} prefillData={(location.state as any)?.prefillOrderData as OrderFormPrefillData | undefined} />}
      {orderToView && (
        <Modal isOpen={!!orderToView} onClose={() => setOrderToView(null)} title={`Detalhes da Encomenda: ${orderToView.productName} ${orderToView.model}`} size="3xl">
          <div className="space-y-4 text-sm">
            <Card>
              <h3 className="text-lg font-semibold mb-2">Informações Gerais</h3>
              <p className="text-gray-700"><strong>Cliente:</strong> {orderToView.clientId ? getClientName(orderToView.clientId) : orderToView.customerName}</p>
              <p className="text-gray-700"><strong>Produto:</strong> {orderToView.productName} {orderToView.model} {orderToView.watchSize && `(${orderToView.watchSize})`} ({orderToView.capacity}) - {orderToView.color} [{orderToView.condition}]</p>
              <div className="flex items-center text-gray-700"><strong>Fornecedor:</strong>&nbsp;{supplierNameVisible ? (<span>{orderToView.supplierName || 'N/A'}</span>) : (<span className="blur-sm select-none">Fornecedor Protegido X</span>)}<Button variant="ghost" size="sm" onClick={() => setSupplierNameVisible(!supplierNameVisible)} className="ml-2 p-1">{supplierNameVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}</Button></div>
              <div className="flex items-center text-gray-700"><strong>Custo (Fornecedor):</strong>&nbsp;{purchasePriceVisible ? (<span>{formatCurrencyBRL(orderToView.purchasePrice)}</span>) : (<span className="blur-sm select-none">{formatCurrencyBRL(orderToView.purchasePrice)}</span>)}<Button variant="ghost" size="sm" onClick={() => setPurchasePriceVisible(!purchasePriceVisible)} className="ml-2 p-1">{purchasePriceVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}</Button></div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-2">Detalhes Financeiros</h3>
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
                  {orderToView.imei && orderToView.paymentMethod === PaymentMethod.BLU_FACILITA && orderToView.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO && (
                    <Button variant={orderToView.imeiBlocked ? 'secondary' : 'danger'} size="sm" className="mt-2" onClick={() => handleToggleImeiLockAction(orderToView)}>
                      {orderToView.imeiBlocked ? <LockOpenIcon className="h-4 w-4 mr-1" /> : <LockClosedIcon className="h-4 w-4 mr-1" />} {orderToView.imeiBlocked ? 'Desbloquear IMEI' : 'Bloquear IMEI'}
                    </Button>
                  )}
                  {orderToView.bluFacilitaInstallments && orderToView.bluFacilitaInstallments.length > 0 && (
                    <details className="mt-2 text-xs"><summary className="cursor-pointer text-blue-600 hover:underline">Ver Parcelas Detalhadas</summary>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        {orderToView.bluFacilitaInstallments.map(inst => (
                          <li key={inst.installmentNumber}>Parcela {inst.installmentNumber}: {formatCurrencyBRL(inst.amount)} (Venc: {formatDateBR(inst.dueDate)}) - Status: {inst.status} {inst.amountPaid ? `(Pago ${formatCurrencyBRL(inst.amountPaid)} em ${formatDateBR(inst.paymentDate)})` : ''}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              {orderToView.shippingCostSupplierToBlu !== undefined && <p className="text-gray-700"><strong>Custo Frete (Fornecedor → Blu):</strong> {formatCurrencyBRL(orderToView.shippingCostSupplierToBlu)}</p>}
              {orderToView.shippingCostBluToClient !== undefined && <p className="text-gray-700"><strong>Custo Frete (Blu → Cliente):</strong> {formatCurrencyBRL(orderToView.shippingCostBluToClient)}</p>}
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-2">Status e Histórico</h3>
              <p className="text-gray-700"><strong>Data do Pedido:</strong> {formatDateBR(orderToView.orderDate)}</p>
              <p className="text-gray-700"><strong>Prazo Estimado:</strong> {formatDateBR(orderToView.estimatedDeliveryDate)}</p>
              {(() => { const d = getDeliveryDate(orderToView); if(d) { const onTime = orderToView.estimatedDeliveryDate ? new Date(d) <= new Date(orderToView.estimatedDeliveryDate + 'T23:59:59') : true; return <p className="text-gray-700"><strong>Data de Entrega:</strong> {formatDateBR(d)} {orderToView.estimatedDeliveryDate && (<span className={onTime ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>({onTime ? 'Em dia' : 'Atraso'})</span>)}</p>; } else { return <p className="text-gray-700"><CountdownDisplay targetDate={orderToView.estimatedDeliveryDate} /></p>; } })()}
              {orderToView.arrivalDate && <p className="text-gray-700"><strong>Data de Chegada:</strong> {formatDateBR(orderToView.arrivalDate)}</p>}
              {orderToView.imei && <p className="text-gray-700"><strong>IMEI:</strong> {orderToView.imei}</p>}
              {orderToView.batteryHealth !== undefined && <p className="text-gray-700"><strong>Saúde da Bateria:</strong> {orderToView.batteryHealth}%</p>}
              {orderToView.readyForDelivery && <p className="font-semibold text-green-600">Produto pronto para entrega!</p>}
              <div><h4 className="text-md font-semibold mb-1 text-gray-800">Linha do Tempo:</h4><OrderStatusTimeline order={orderToView} /></div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-2">Notas e Anexos</h3>
              {orderToView.notes && <p className="text-gray-700"><strong>Observações (Pedido):</strong> {orderToView.notes}</p>}
              {orderToView.arrivalNotes && <p className="text-gray-700"><strong>Observações (Chegada):</strong> {orderToView.arrivalNotes}</p>}
              {orderToView.whatsAppHistorySummary && <p className="text-gray-700"><strong>Resumo WhatsApp:</strong> {orderToView.whatsAppHistorySummary}</p>}
              {orderToView.internalNotes && orderToView.internalNotes.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">Notas Internas</summary>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border mt-1">
                    {orderToView.internalNotes.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(note => (
                      <div key={note.id} className="mb-1.5 pb-1.5 border-b border-gray-200 last:border-b-0">
                        <p className="text-xs text-gray-500">{formatDateBR(note.date, true)}</p>
                        <p className="whitespace-pre-wrap">{note.note}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <details className="mt-2">
                <summary className="cursor-pointer font-semibold">Pagamentos Recebidos</summary>
                {clientPayments.length > 0 ? (
                  <ul className="list-disc pl-5 text-xs bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto mt-1">
                    {clientPayments.map(p => (
                      <li key={p.id}>
                        {formatDateBR(p.paymentDate)}: {formatCurrencyBRL(p.amountPaid)} ({p.paymentMethodUsed}){p.notes && <span className="text-gray-500"> - {p.notes}</span>}
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-xs text-gray-500 mt-1 block">Nenhum pagamento registrado para esta encomenda.</span>}
                <Button variant="ghost" size="sm" onClick={() => setOrderToRegisterPayment(orderToView)} leftIcon={<CreditCardIcon className="h-4 w-4"/>} className="mt-1">Registrar Recebimento</Button>
              </details>

              <div className="mt-2"><h4 className="text-md font-semibold mb-1 text-gray-800">Documentos:</h4>{orderToView.documents.length > 0 ? orderToView.documents.map(d => <span key={d.id} className="text-xs bg-gray-100 p-1 rounded mr-1">{d.name}</span>) : <span className="text-xs text-gray-500">Nenhum.</span>}</div>
            </Card>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => { setOrderToView(null); handleOpenForm(orderToView); }}>Editar Encomenda</Button>
              <Button variant="secondary" onClick={() => { setOrderToView(null); navigate(`/orders/${orderToView.id}/occurrences`); }}>Ocorrências</Button>
              <Button onClick={() => setOrderToView(null)}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}
      {orderToRegisterArrival && (
        <RegisterArrivalModal
          order={orderToRegisterArrival}
          isOpen={!!orderToRegisterArrival}
          onClose={() => setOrderToRegisterArrival(null)}
          onSave={handleSaveOrder}
          onArrivalRegistered={(o) => {
            const client = clients.find(c => c.id === o.clientId);
            const phone = client ? client.phone : '';
            setToastData({
              message: 'Chegada registrada com sucesso.',
              action: () => {
                const msg = `Olá, ${client ? client.fullName : o.customerName}! Boas notícias, seu ${o.productName} chegou e já está disponível. Podemos combinar a entrega?`;
                const link = `https://wa.me/${cleanPhoneNumberForWhatsApp(phone)}?text=${encodeURIComponent(msg)}`;
                window.open(link, '_blank');
              }
            });
          }}
        />
      )}
      {orderToToggleImeiLock && ( <Modal isOpen={!!orderToToggleImeiLock} onClose={() => setOrderToToggleImeiLock(null)} title={`${orderToToggleImeiLock.imeiBlocked ? 'Confirmar Desbloqueio' : 'Confirmar Bloqueio'} de IMEI`} size="md" footer={ <> <Button variant="secondary" onClick={() => setOrderToToggleImeiLock(null)}>Cancelar</Button> <Button variant={orderToToggleImeiLock.imeiBlocked ? "primary" : "danger"} onClick={confirmToggleImeiLock}> {orderToToggleImeiLock.imeiBlocked ? 'Sim, Desbloquear' : 'Sim, Bloquear'} </Button> </> } > <p className="text-gray-700"> Tem certeza que deseja <strong>{orderToToggleImeiLock.imeiBlocked ? 'desbloquear' : 'bloquear'}</strong> o IMEI <span className="font-semibold"> {orderToToggleImeiLock.imei}</span> para o pedido de <span className="font-semibold">{orderToToggleImeiLock.clientId ? getClientName(orderToToggleImeiLock.clientId) : orderToToggleImeiLock.customerName}</span>? </p> <p className="text-sm text-gray-600 mt-2"> Esta ação é para controle interno e não realiza bloqueio/desbloqueio real na operadora. </p> </Modal> )}
      {orderToRegisterPayment && ( <RegisterPaymentModal order={orderToRegisterPayment} isOpen={!!orderToRegisterPayment} onClose={() => setOrderToRegisterPayment(null)} onPaymentSaved={handlePaymentSaved} /> )}
      {toastData && (
        <Toast message={toastData.message} actionLabel="Avisar Cliente" onAction={toastData.action} onClose={() => setToastData(null)} />
      )}
    </div>
  );
};