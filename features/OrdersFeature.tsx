import React, { useState, useRef, useEffect, useCallback, useMemo, ReactNode, ChangeEvent, useReducer } from 'react';
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
  getCorreiosAREvents,
  sendOrderContractToAutentique,
} from '../services/AppService';
import { Button, Modal, Input, Select, Textarea, Card, PageTitle, Alert, ResponsiveTable, Spinner, WhatsAppIcon, ClipboardDocumentIcon, Stepper, Toast, OrderProgressBar, Tabs, Tab } from '../components/SharedComponents';
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

const ThreeuToolsTable: React.FC<{ report: string }> = ({ report }) => {
  const rows = report
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split(/\s{2,}/).filter(Boolean));
  if (rows.length === 0) return null;
  return (
    <div className="overflow-auto mt-1">
      <table className="min-w-full text-xs border">
        <tbody>
          {rows.map((cols, i) => (
            <tr key={i}>
              {cols.map((c, j) => (
                <td key={j} className="border px-1 py-0.5 whitespace-nowrap">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


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
  arrivalDate: undefined, imei: undefined, arrivalPhotos: [], arrivalNotes: undefined, threeuToolsReport: '', batteryHealth: undefined, readyForDelivery: false,
  deliveryDate: undefined,
  shippingCostSupplierToBlu: undefined, shippingCostBluToClient: undefined,
  trackingCode: '',
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


interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Order) => Promise<void>;
  initialOrder?: Order | null;
  prefillData?: Partial<OrderFormPrefillData>;
  /**
   * When true the form is wrapped in a modal (default behaviour).
   * When false the form is rendered inline on the page.
   */
  useModal?: boolean;
}
interface OrderFormPrefillData {
    sellingPrice?: number;
    downPayment?: number;
    installments?: number;
    bluFacilitaUsesSpecialRate?: boolean;
    bluFacilitaSpecialAnnualRate?: number;
    paymentMethod?: PaymentMethod;
}


export const OrderForm: React.FC<OrderFormProps> = ({ isOpen, onClose, onSave, initialOrder, prefillData, useModal = true }) => {
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
            imei: initialOrder.imei,
            arrivalNotes: initialOrder.arrivalNotes,
            threeuToolsReport: initialOrder.threeuToolsReport || '',
            batteryHealth: initialOrder.batteryHealth,
            readyForDelivery: initialOrder.readyForDelivery,
            imeiBlocked: initialOrder.imeiBlocked || false,
            shippingCostSupplierToBlu: initialOrder.shippingCostSupplierToBlu,
            shippingCostBluToClient: initialOrder.shippingCostBluToClient,
            trackingCode: initialOrder.trackingCode || '',
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


  const formBody = (
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
  );

  return (
    <>
    {useModal ? (
      <Modal isOpen={isOpen} onClose={onClose} title={initialOrder ? 'Editar Encomenda' : 'Adicionar Nova Encomenda'} size="3xl">
        {formBody}
      </Modal>
    ) : (
      isOpen && <div className="max-w-3xl mx-auto">{formBody}</div>
    )}
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
    const [arrivalData, setArrivalData] = useState({ arrivalDate: order.arrivalDate ? new Date(order.arrivalDate + "T00:00:00").toISOString().split('T')[0] : new Date().toISOString().split('T')[0], imei: order.imei || '', arrivalNotes: order.arrivalNotes || '', threeuToolsReport: order.threeuToolsReport || '', batteryHealth: order.batteryHealth || undefined, readyForDelivery: order.readyForDelivery || false, });
    const [arrivalPhotos, setArrivalPhotos] = useState<DocumentFile[]>(order.arrivalPhotos || []);
    const [isLoading, setIsLoading] = useState(false);
    const [clientName, setClientName] = useState(order.customerName);
    useEffect(() => { if(order.clientId){ getClientById(order.clientId).then(c=> setClientName(c?.fullName || order.customerName)); } }, [order]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value, type } = e.target; if (type === 'checkbox') { setArrivalData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked })); } else if (name === "batteryHealth"){ setArrivalData(prev => ({...prev, batteryHealth: parseInt(value, 10) || undefined}))} else { setArrivalData(prev => ({ ...prev, [name]: value })); } };
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleAddPhotoClick = () => fileInputRef.current?.click();
    const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const remaining = Math.max(0, 5 - arrivalPhotos.length);
            const newFiles = Array.from(files).slice(0, remaining).map(f => ({ id: uuidv4(), name: f.name, url: URL.createObjectURL(f), uploadedAt: new Date().toISOString(), type: f.type, size: f.size }));
            if (newFiles.length) setArrivalPhotos(prev => [...prev, ...newFiles]);
            e.target.value = "";
        }
    };
    const handleSubmit = async () => { setIsLoading(true); const updatedOrder: Order = { ...order, ...arrivalData, arrivalPhotos, status: arrivalData.readyForDelivery ? OrderStatus.AGUARDANDO_RETIRADA : order.status, trackingHistory: arrivalData.readyForDelivery && order.status !== OrderStatus.AGUARDANDO_RETIRADA ? [...(order.trackingHistory || []), {status: OrderStatus.AGUARDANDO_RETIRADA, date: new Date().toISOString(), notes: "Produto recebido e pronto"}] : order.trackingHistory, }; await onSave(updatedOrder); setIsLoading(false); onClose(); onArrivalRegistered && onArrivalRegistered(updatedOrder); };
    return ( <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Chegada: ${order.productName} ${order.model}`} size="lg"> <div className="space-y-4"> <Input id="arrivalDate" label="Data de Chegada" type="date" name="arrivalDate" value={arrivalData.arrivalDate} onChange={handleChange} required /> <Input id="imei" label="IMEI do Aparelho" name="imei" value={arrivalData.imei} onChange={handleChange} placeholder="Se aplicável" /> {(order.condition === ProductCondition.SEMINOVO || order.condition === ProductCondition.USADO_BOM || order.condition === ProductCondition.USADO_EXCELENTE) && ( <Input id="batteryHealth" label="Saúde da Bateria (%)" type="number" name="batteryHealth" min="0" max="100" value={String(arrivalData.batteryHealth || '')} onChange={handleChange} /> )} <Textarea id="arrivalNotes" label="Observações da Chegada" name="arrivalNotes" value={arrivalData.arrivalNotes} onChange={handleChange} rows={3} /> <Textarea id="threeuToolsReport" label="Relatório 3uTools" name="threeuToolsReport" value={arrivalData.threeuToolsReport} onChange={handleChange} rows={4} /> <div> <label className="block text-sm font-medium text-gray-700 mb-1">Fotos do Produto (até 5)</label> <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosSelected} /> {arrivalPhotos.map(p => <img key={p.id} src={p.url} alt={p.name} className="h-16 inline-block mr-1" />)} <Button onClick={handleAddPhotoClick} size="sm" variant="ghost" className="mt-1">Adicionar Foto</Button> </div> <div className="flex items-center"> <input type="checkbox" id="readyForDelivery" name="readyForDelivery" checked={arrivalData.readyForDelivery} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /> <label htmlFor="readyForDelivery" className="ml-2 block text-sm text-gray-900">Marcar como PRONTO PARA ENTREGA</label> </div> <div className="flex justify-end space-x-2 pt-3"> <Button variant="secondary" onClick={onClose}>Cancelar</Button> <Button onClick={handleSubmit} isLoading={isLoading}>Salvar Chegada</Button> </div> </div> </Modal> );
};

interface OrderViewModalProps { order: Order; isOpen: boolean; onClose: () => void; }
const OrderViewModal: React.FC<OrderViewModalProps> = ({ order, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'Resumo' | 'Financeiro' | 'Histórico & Notas' | 'Anexos'>('Resumo');
  const [supplierNameVisible, setSupplierNameVisible] = useState(false);
  const [purchasePriceVisible, setPurchasePriceVisible] = useState(false);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes: ${order.productName} ${order.model}`} size="xl">
      <Tabs className="mb-4">
        <Tab label="Resumo" isActive={activeTab === 'Resumo'} onClick={() => setActiveTab('Resumo')} />
        <Tab label="Financeiro" isActive={activeTab === 'Financeiro'} onClick={() => setActiveTab('Financeiro')} />
        <Tab label="Histórico & Notas" isActive={activeTab === 'Histórico & Notas'} onClick={() => setActiveTab('Histórico & Notas')} />
        <Tab label="Anexos" isActive={activeTab === 'Anexos'} onClick={() => setActiveTab('Anexos')} />
      </Tabs>
      {activeTab === 'Resumo' && (
        <div className="space-y-2 text-sm">
          <p><strong>Cliente:</strong> {order.clientId || order.customerName}</p>
          <p><strong>Produto:</strong> {order.productName} {order.model} {order.watchSize && `(${order.watchSize})`} ({order.capacity}) - {order.color} [{order.condition}]</p>
          <div className="flex items-center">
            <strong>Fornecedor:</strong>&nbsp;
            {supplierNameVisible ? (<span>{order.supplierName || 'N/A'}</span>) : (<span className="blur-sm select-none">Fornecedor Protegido</span>)}
            <Button variant="ghost" size="sm" onClick={() => setSupplierNameVisible(!supplierNameVisible)} className="ml-2 p-1">
              {supplierNameVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center">
            <strong>Custo (Fornecedor):</strong>&nbsp;
            {purchasePriceVisible ? (<span>{formatCurrencyBRL(order.purchasePrice)}</span>) : (<span className="blur-sm select-none">{formatCurrencyBRL(order.purchasePrice)}</span>)}
            <Button variant="ghost" size="sm" onClick={() => setPurchasePriceVisible(!purchasePriceVisible)} className="ml-2 p-1">
              {purchasePriceVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
      {activeTab === 'Financeiro' && (
        <div className="space-y-2 text-sm">
          {order.sellingPrice !== undefined && <p><strong>Valor de Venda:</strong> {formatCurrencyBRL(order.sellingPrice)}</p>}
          <p><strong>Forma de Pagamento:</strong> {order.paymentMethod || 'N/A'}</p>
          {order.paymentMethod === PaymentMethod.BLU_FACILITA && (
            <div className="p-2 border-l-4 border-blue-500 bg-blue-50 space-y-1">
              {order.bluFacilitaUsesSpecialRate && <p><strong>Taxa:</strong> {order.bluFacilitaSpecialAnnualRate?.toFixed(2)}% a.a. (Especial)</p>}
              {!order.bluFacilitaUsesSpecialRate && <p><strong>Taxa:</strong> {DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE * 100}% a.a.</p>}
              <p><strong>Entrada:</strong> {formatCurrencyBRL(order.downPayment)}</p>
              <p><strong>Valor Financiado:</strong> {formatCurrencyBRL(order.financedAmount)}</p>
              <p><strong>Total com Juros:</strong> {formatCurrencyBRL(order.totalWithInterest)}</p>
              <p><strong>Parcelas:</strong> {order.installments}</p>
              <p><strong>Valor Parcela:</strong> {formatCurrencyBRL(order.installmentValue)}</p>
            </div>
          )}
          {order.shippingCostSupplierToBlu !== undefined && <p><strong>Custo Frete (Fornecedor → Blu):</strong> {formatCurrencyBRL(order.shippingCostSupplierToBlu)}</p>}
          {order.shippingCostBluToClient !== undefined && <p><strong>Custo Frete (Blu → Cliente):</strong> {formatCurrencyBRL(order.shippingCostBluToClient)}</p>}
        </div>
      )}
      {activeTab === 'Histórico & Notas' && (
        <div className="space-y-2 text-sm">
          <p><strong>Status Atual:</strong> {order.status}</p>
          {order.notes && <p><strong>Observações:</strong> {order.notes}</p>}
          {order.arrivalNotes && <p><strong>Observações (Chegada):</strong> {order.arrivalNotes}</p>}
          {order.threeuToolsReport && (
            <div>
              <strong>Relatório 3uTools:</strong>
              <ThreeuToolsTable report={order.threeuToolsReport} />
            </div>
          )}
          {order.whatsAppHistorySummary && <p><strong>Resumo WhatsApp:</strong> {order.whatsAppHistorySummary}</p>}
        </div>
      )}
      {activeTab === 'Anexos' && (
        <div className="space-y-4 text-sm">
          {order.arrivalPhotos && order.arrivalPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {order.arrivalPhotos.map(photo => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.name}
                  className="w-24 h-24 object-cover rounded"
                />
              ))}
            </div>
          )}
          <div className="space-y-2">
            {order.documents.length > 0 ? (
              order.documents.map(d => (
                <span key={d.id} className="text-xs bg-gray-100 p-1 rounded mr-1">{d.name}</span>
              ))
            ) : (
              <span className="text-xs text-gray-500">Nenhum documento.</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderToRegisterArrival, setOrderToRegisterArrival] = useState<Order | null>(null);
  const [orderToToggleImeiLock, setOrderToToggleImeiLock] = useState<Order | null>(null);
  const [orderToRegisterPayment, setOrderToRegisterPayment] = useState<Order | null>(null);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const location = useLocation(); const navigate = useNavigate();

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
  
  
  const handleSaveOrder = async (order: Order) => { 
    await saveOrder(order); 
    await fetchAllData(); 
    setIsFormOpen(false); 
    setEditingOrder(null); 
    if(orderToRegisterArrival?.id === order.id) setOrderToRegisterArrival(null); 
    if(orderToToggleImeiLock?.id === order.id) setOrderToToggleImeiLock(null);
    if(orderToRegisterPayment?.id === order.id) setOrderToRegisterPayment(null);
  };

  const handleOpenForm = (order?: Order) => { setEditingOrder(order || null); setIsFormOpen(true); };
  
  const handleDeleteOrder = async (orderId: string) => { 
    if (window.confirm('Tem certeza que deseja excluir esta encomenda?')) { 
        await deleteOrder(orderId);
        await fetchAllData();
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
                onClick={(e) => {
                    e.stopPropagation();
                    setOrderToView(item);
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
        <ResponsiveTable columns={columns} data={filteredOrders} isLoading={isLoading} emptyStateMessage="Nenhuma encomenda encontrada." onRowClick={(item) => navigate(`/orders/${item.id}`)} rowKeyAccessor="id" />
      {isFormOpen && <OrderForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingOrder(null); }} onSave={handleSaveOrder} initialOrder={editingOrder} prefillData={(location.state as any)?.prefillOrderData as OrderFormPrefillData | undefined} />}
      {orderToToggleImeiLock && ( <Modal isOpen={!!orderToToggleImeiLock} onClose={() => setOrderToToggleImeiLock(null)} title={`${orderToToggleImeiLock.imeiBlocked ? 'Confirmar Desbloqueio' : 'Confirmar Bloqueio'} de IMEI`} size="md" footer={ <> <Button variant="secondary" onClick={() => setOrderToToggleImeiLock(null)}>Cancelar</Button> <Button variant={orderToToggleImeiLock.imeiBlocked ? "primary" : "danger"} onClick={confirmToggleImeiLock}> {orderToToggleImeiLock.imeiBlocked ? 'Sim, Desbloquear' : 'Sim, Bloquear'} </Button> </> } > <p className="text-gray-700"> Tem certeza que deseja <strong>{orderToToggleImeiLock.imeiBlocked ? 'desbloquear' : 'bloquear'}</strong> o IMEI <span className="font-semibold"> {orderToToggleImeiLock.imei}</span> para o pedido de <span className="font-semibold">{orderToToggleImeiLock.clientId ? getClientName(orderToToggleImeiLock.clientId) : orderToToggleImeiLock.customerName}</span>? </p> <p className="text-sm text-gray-600 mt-2"> Esta ação é para controle interno e não realiza bloqueio/desbloqueio real na operadora. </p> </Modal> )}
      {orderToRegisterPayment && ( <RegisterPaymentModal order={orderToRegisterPayment} isOpen={!!orderToRegisterPayment} onClose={() => setOrderToRegisterPayment(null)} onPaymentSaved={handlePaymentSaved} /> )}
      {orderToRegisterArrival && (
        <RegisterArrivalModal
          order={orderToRegisterArrival}
          isOpen={!!orderToRegisterArrival}
          onClose={() => setOrderToRegisterArrival(null)}
          onSave={handleSaveOrder}
        />
      )}
      {orderToView && (
        <OrderViewModal order={orderToView} isOpen={!!orderToView} onClose={() => setOrderToView(null)} />
      )}
      {toastData && (
        <Toast message={toastData.message} actionLabel="Avisar Cliente" onAction={toastData.action} onClose={() => setToastData(null)} />
      )}
    </div>
  );
};