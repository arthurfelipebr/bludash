// import { GoogleGenAI, GenerateContentResponse } from "@google/genai"; // Will be backend
import { 
    Order, OrderStatus, ProductCondition, ParsedSupplierProduct, GeminiParsedProduct, 
    AggregatedProductPrice, Client, ClientType, PaymentMethod, BluFacilitaContractStatus, 
    DocumentFile, Supplier, TodayTask, TaskType, CreditCardRate, CalculatedCardFeeResult, 
    OrderCostItem, CostType, InternalNote, DashboardAlert, WeeklySummaryStats, 
    DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE as DEFAULT_BF_RATE_CONST, 
    ClientPayment, User, HistoricalParsedProduct 
} from '../types'; // Updated User type
import { v4 as uuidv4 } from 'uuid';
// --- CONSTANTS ---
export const APP_NAME = "Blu Imports Dashboard";
// API_KEY is no longer client-side

export const ORDER_STATUS_OPTIONS: OrderStatus[] = Object.values(OrderStatus);
export const PRODUCT_CONDITION_OPTIONS: ProductCondition[] = Object.values(ProductCondition);
export const CLIENT_TYPE_OPTIONS: ClientType[] = Object.values(ClientType);
export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = Object.values(PaymentMethod);
export const BLU_FACILITA_CONTRACT_STATUS_OPTIONS: BluFacilitaContractStatus[] = Object.values(BluFacilitaContractStatus);
export const COST_TYPE_OPTIONS_SELECT = Object.values(CostType).map(ct => ({ value: ct, label: ct }));
export const DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE = DEFAULT_BF_RATE_CONST;

// --- API Client Helper ---
const getAuthToken = () => localStorage.getItem('authToken');

async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, { // Assuming API is proxied or on same domain under /api
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `API request failed: ${response.statusText}` }));
    const detailInfo = errorData.details ? ` (${errorData.details})` : '';
    const msg = errorData.message || `API request failed: ${response.status}`;
    throw new Error(`${msg}${detailInfo}`);
  }
  if (response.status === 204) { // No Content
    return undefined as T;
  }
  return response.json();
}


// --- UTILITY FUNCTIONS --- (Largely unchanged, but Timestamp type from Firestore might be removed if not used elsewhere)

export const formatCurrencyBRL = (value?: number): string => {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Firestore Timestamp type is removed, adjust if it was relied upon for specific behavior
export const formatDateBR = (dateInput?: string | Date /* | Timestamp Removed */, includeTime: boolean = false): string => {
  if (!dateInput) return 'N/A';
  let date: Date;
  try {
    /* if (dateInput instanceof Timestamp) { // Removed Firestore Timestamp
        date = dateInput.toDate();
    } else */ if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'string') {
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
        const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (simpleDateRegex.test(dateInput) && dateInput.length === 10) {
             const [year, month, day] = dateInput.split('-').map(Number);
             date = new Date(Date.UTC(year, month - 1, day));
        } else if (isoDateRegex.test(dateInput)) {
            date = new Date(dateInput);
        } else {
             const parsedAttempt = new Date(dateInput);
             if (!isNaN(parsedAttempt.getTime())) {
                 date = parsedAttempt;
             } else {
                 console.warn("Unrecognized date string format:", dateInput);
                 return 'Data Inválida (formato)';
             }
        }
    } else {
        return 'Data Inválida (tipo)';
    }
    if (isNaN(date.getTime())) return 'Data Inválida (valor)';
    
    const options: Intl.DateTimeFormatOptions = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
    };
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) && dateInput.length === 10 && !includeTime) {
        options.timeZone = 'UTC';
    }
    if (includeTime) { 
        options.hour = '2-digit'; 
        options.minute = '2-digit'; 
    }
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
  } catch (error) {
    console.error("Error formatting date:", dateInput, error);
    return 'Erro Data';
  }
};

export const exportToCSV = (data: any[], filename: string = 'export.csv'): void => {
  if (!data || data.length === 0) { alert('Nenhum dado para exportar.'); return; }
  const headers = Object.keys(data[0]);
  const csvRows = [ headers.join(','), ...data.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(',')) ];
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatCPFOrCNPJ = (value: string, type?: ClientType): string => {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    if (type === ClientType.PESSOA_FISICA) {
        if (cleaned.length <= 3) return cleaned;
        if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
        if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
    } else if (type === ClientType.PESSOA_JURIDICA) {
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
        if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
        if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
        return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
    }
    if (cleaned.length === 11) return formatCPFOrCNPJ(cleaned, ClientType.PESSOA_FISICA);
    if (cleaned.length === 14) return formatCPFOrCNPJ(cleaned, ClientType.PESSOA_JURIDICA);
    return value; 
};
export const cleanPhoneNumberForWhatsApp = (phone: string): string => { 
    let cleaned = phone.replace(/\D/g, ''); 
    if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) { 
        cleaned = '55' + cleaned;
    }
    return cleaned;
};
export const parseBRLCurrencyStringToNumber = (value: string): number => {
  if (!value) return 0;
  const cleanedValue = value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const number = parseFloat(cleanedValue);
  return isNaN(number) ? 0 : number;
};
export const formatNumberToBRLCurrencyInput = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const normalizeProductCondition = (condition?: string): string => {
  if (!condition) return '';
  const cleaned = condition.trim().toLowerCase();
  if (cleaned === 'novo' || cleaned === 'lacrado' || cleaned === 'novo lacrado') {
    return ProductCondition.LACRADO;
  }
  if (cleaned === 'caixa aberta' || cleaned === 'novo (caixa aberta)') {
    return ProductCondition.NOVO_CAIXA_ABERTA;
  }
  return condition;
};

// --- Gemini AI Service ---
// The actual Gemini API call will now happen on the backend.
// This function will call our backend, which then calls Gemini.
export const initializeGeminiServiceOnBackend = (): boolean => {
  // This function is now more of a conceptual placeholder or could be used
  // to check if the backend reports Gemini as available.
  // For now, assume backend handles it.
  console.log("Gemini service is expected to be initialized and used by the backend.");
  return true; // Placeholder
};
export const isGeminiAvailable = (): boolean => {
  // This would ideally check a status from the backend.
  // For now, assume true if backend is supposed to handle it.
  return true; // Placeholder
};

export const parseSupplierListWithGemini = async ( textList: string, supplier: Supplier ): Promise<ParsedSupplierProduct[]> => {
  console.log("Requesting backend to parse supplier list for:", supplier.name);
  try {
    // The backend will receive this, call Gemini, and return the structured data.
    const parsedItems = await apiClient<GeminiParsedProduct[]>('/gemini/parse-supplier-list', {
      method: 'POST',
      body: JSON.stringify({ textList, supplierId: supplier.id, supplierName: supplier.name }), 
    });
    
    if (parsedItems && Array.isArray(parsedItems)) {
      return parsedItems.map(p => ({
        id: uuidv4(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        product: p.produto || 'N/A',
        model: p.modelo || 'N/A',
        capacity: p.capacidade || 'N/A',
        color: undefined,
        characteristics: p.caracteristicas || undefined,
        country: p.pais || undefined,
        condition: p.condicao || 'N/A',
        priceBRL: p.precoBRL !== undefined ? p.precoBRL : null,
        priceUSD: p.precoUSD !== undefined ? p.precoUSD : null,
        originalTextLine: "Não disponível nesta versão do parser"
      }));
    }
    console.error("Backend response for Gemini parsing was not a valid array:", parsedItems);
    return [];
  } catch (error) {
    console.error("Error calling backend for Gemini parsing:", error);
    if (error instanceof Error) {
      throw new Error(`Falha ao comunicar com o servidor para processar a lista: ${error.message}`);
    }
    throw new Error("Falha ao comunicar com o servidor para processar a lista. Verifique o console para detalhes.");
  }
};

// --- Data Service Functions (Interacting with Backend API) ---

// getCurrentUserId is removed, user ID will come from AuthContext or backend token

// --- Orders Service ---
export const getOrders = async (): Promise<Order[]> => {
  return apiClient<Order[]>('/orders');
};

export const getOrderById = async (orderId: string): Promise<Order | undefined> => {
  try {
    return await apiClient<Order>(`/orders/${orderId}`);
  } catch (error: any) {
    if (error.message.includes("404") || error.message.toLowerCase().includes('not found')) return undefined;
    throw error;
  }
};

export const calculateBluFacilitaDetails = ( productValue: number, downPayment: number, installmentsCount: number, annualInterestRate: number ): Pick<Order, 'financedAmount' | 'totalWithInterest' | 'installmentValue'> => {
    const financedAmount = productValue - downPayment;
    if (financedAmount <= 0) {
        return { financedAmount: 0, totalWithInterest: 0, installmentValue: 0 };
    }
    const monthlyInterestRateDecimal = annualInterestRate / 12;
    const totalInterest = financedAmount * monthlyInterestRateDecimal * installmentsCount;
    const totalWithInterest = financedAmount + totalInterest;
    const installmentValue = totalWithInterest / installmentsCount;
    return {
        financedAmount: parseFloat(financedAmount.toFixed(2)),
        totalWithInterest: parseFloat(totalWithInterest.toFixed(2)),
        installmentValue: parseFloat(installmentValue.toFixed(2))
    };
};

// deriveBluFacilitaContractStatus remains client-side logic based on installment data
const deriveBluFacilitaContractStatus = (installments?: Order['bluFacilitaInstallments']): BluFacilitaContractStatus => {
    if (!installments || installments.length === 0) return BluFacilitaContractStatus.EM_DIA; 
    const today = new Date(); today.setHours(0,0,0,0); 
    let allPaid = true, hasOverdue = false;
    for (const inst of installments) {
        if (inst.status !== 'Pago') {
            allPaid = false;
            const dueDate = new Date(inst.dueDate + "T00:00:00"); dueDate.setHours(0,0,0,0);
            if (dueDate < today && (inst.status === 'Pendente' || inst.status === 'Atrasado')) hasOverdue = true;
        }
    }
    if (allPaid) return BluFacilitaContractStatus.PAGO_INTEGRALMENTE;
    if (hasOverdue) return BluFacilitaContractStatus.ATRASADO;
    return BluFacilitaContractStatus.EM_DIA;
};

export const saveOrder = async (orderData: Omit<Order, 'id' | 'userId'> | Order): Promise<Order> => {
  // Client-side preparations can remain, like deriving BluFacilita status
  let orderToSave: Omit<Order, 'userId'> & { id?: string } = { // userId will be handled by backend
    ...(orderData as Order),
    orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
    trackingHistory: (orderData as Order).trackingHistory || [{ status: orderData.status, date: new Date().toISOString(), notes: "Pedido Criado" }],
  };
  
  // If client/supplier names need to be denormalized based on ID, this logic can be done here or on backend.
  // For simplicity, let's assume frontend still does this if IDs are available.
  if (orderToSave.clientId && !orderToSave.customerName) { /* Placeholder: const client = await getClientById(orderToSave.clientId); if (client) orderToSave.customerName = client.fullName; */ }
  if (orderToSave.supplierId && !orderToSave.supplierName) { /* Placeholder: const supplier = await getSupplierById(orderToSave.supplierId); if (supplier) orderToSave.supplierName = supplier.name; */ }

  if (orderToSave.paymentMethod === PaymentMethod.BLU_FACILITA && orderToSave.sellingPrice && orderToSave.installments) {
      // BluFacilita calculation logic remains client-side for immediate feedback in form
      // Backend should re-validate/re-calculate for security.
      const annualRateToUse = orderToSave.bluFacilitaUsesSpecialRate && orderToSave.bluFacilitaSpecialAnnualRate
          ? orderToSave.bluFacilitaSpecialAnnualRate / 100
          : DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE;
      const bfDetails = calculateBluFacilitaDetails(orderToSave.sellingPrice, orderToSave.downPayment || 0, orderToSave.installments, annualRateToUse);
      orderToSave = { ...orderToSave, ...bfDetails };

      if (!orderToSave.bluFacilitaInstallments || orderToSave.bluFacilitaInstallments.length !== orderToSave.installments) { /* ... generate installments ... */ }
      orderToSave.bluFacilitaContractStatus = deriveBluFacilitaContractStatus(orderToSave.bluFacilitaInstallments);
  } else { /* clear BluFacilita fields */ }

  // Check for userId to decide if the order already exists. New orders have an
  // id generated on the client but lack a userId until persisted.
  if ('userId' in orderData && orderData.userId) {
    return apiClient<Order>(`/orders/${orderData.id}`, { method: 'PUT', body: JSON.stringify(orderToSave) });
  } else {
    return apiClient<Order>('/orders', { method: 'POST', body: JSON.stringify(orderToSave) });
  }
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  return apiClient<void>(`/orders/${orderId}`, { method: 'DELETE' });
};

// --- Client Service ---
export const getClients = async (search?: string): Promise<Client[]> => {
    const url = search ? `/clients?search=${encodeURIComponent(search)}` : '/clients';
    return apiClient<Client[]>(url);
};
export const saveClient = async (clientData: Omit<Client, 'id'|'userId'> | Client): Promise<Client> => {
    const clientToSave = { ...clientData, registrationDate: clientData.registrationDate || new Date().toISOString() };
    if ('id' in clientData && clientData.id) {
        return apiClient<Client>(`/clients/${clientData.id}`, { method: 'PUT', body: JSON.stringify(clientToSave) });
    } else {
        return apiClient<Client>('/clients', { method: 'POST', body: JSON.stringify(clientToSave) });
    }
};
export const deleteClient = async (clientId: string): Promise<void> => {
    return apiClient<void>(`/clients/${clientId}`, { method: 'DELETE' });
};
export const getClientById = async (clientId?: string): Promise<Client | undefined> => {
    if (!clientId) return undefined;
    try {
      return await apiClient<Client>(`/clients/${clientId}`);
    } catch (error: any) {
      if (error.message.includes("404") || error.message.toLowerCase().includes('not found')) return undefined;
      throw error;
    }
};

// --- Supplier Service ---
export const getSuppliers = async (): Promise<Supplier[]> => {
    return apiClient<Supplier[]>('/suppliers');
};
export const saveSupplier = async (supplierData: Omit<Supplier, 'id'|'userId'> | Supplier): Promise<Supplier> => {
    const supplierToSave = { ...supplierData, registrationDate: supplierData.registrationDate || new Date().toISOString() };
     if ('id' in supplierData && supplierData.id) {
        return apiClient<Supplier>(`/suppliers/${supplierData.id}`, { method: 'PUT', body: JSON.stringify(supplierToSave) });
    } else {
        return apiClient<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(supplierToSave) });
    }
};
export const deleteSupplier = async (supplierId: string): Promise<void> => {
    return apiClient<void>(`/suppliers/${supplierId}`, { method: 'DELETE' }); // Backend should handle deleting related historical prices
};
export const getSupplierById = async (supplierId?: string): Promise<Supplier | undefined> => {
    if (!supplierId) return undefined;
    try {
      return await apiClient<Supplier>(`/suppliers/${supplierId}`);
    } catch (error: any) {
      if (error.message.includes("404") || error.message.toLowerCase().includes('not found')) return undefined;
      throw error;
    }
};

// --- Supplier Historical Prices ---
export const saveHistoricalParsedProducts = async (products: HistoricalParsedProduct[]): Promise<void> => {
    if (products.length === 0) return;
    // Backend will associate with user
    return apiClient<void>('/suppliers/prices/historical', { method: 'POST', body: JSON.stringify(products) });
};
export const getHistoricalParsedProducts = async (supplierId?: string): Promise<HistoricalParsedProduct[]> => {
    const endpoint = supplierId ? `/suppliers/prices/historical?supplierId=${supplierId}` : '/suppliers/prices/historical';
    return apiClient<HistoricalParsedProduct[]>(endpoint);
};
export const deleteAllHistoricalProductsForUser = async (): Promise<void> => {
    return apiClient<void>('/suppliers/prices/historical', { method: 'DELETE' });
};
// aggregateSupplierData can remain client-side for now, using data fetched from getHistoricalParsedProducts
export const aggregateSupplierData = async (historicalData: HistoricalParsedProduct[]): Promise<AggregatedProductPrice[]> => {
    // This logic can remain client-side, but it now depends on fetched historicalData and supplierData
    if (historicalData.length === 0) return [];
    const allSuppliers = await getSuppliers(); // Potentially fetch suppliers if not already available
    const supplierDetailsMap = new Map<string, Supplier>();
    allSuppliers.forEach(s => supplierDetailsMap.set(s.id, s));

    const productMap = new Map<string, { pricesBySupplier: Map<string, { price: number, supplierId: string }>, itemsInfo: Partial<HistoricalParsedProduct> }>();
    const latestPricesMap = new Map<string, HistoricalParsedProduct>();
    historicalData.sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime());
    historicalData.forEach(item => {
        if (!item.supplierId) return;
        const normCond = normalizeProductCondition(item.condition);
        const productKey = `${item.productName?.toLowerCase().trim()}-${item.model?.toLowerCase().trim()}-${item.capacity?.toLowerCase().trim()}-${item.color?.toLowerCase().trim() || ''}-${item.characteristics?.toLowerCase().trim() || ''}-${item.country?.toLowerCase().trim() || ''}-${normCond.toLowerCase()}`;
        const supplierProductKey = `${item.supplierId}-${productKey}`;
        if (!latestPricesMap.has(supplierProductKey) && item.priceBRL !== null && item.priceBRL !== undefined) {
            latestPricesMap.set(supplierProductKey, item);
        }
    });
    const latestPriceItems = Array.from(latestPricesMap.values());
    latestPriceItems.forEach(item => {
        const normCond = normalizeProductCondition(item.condition);
        const key = `${item.productName?.toLowerCase().trim()}-${item.model?.toLowerCase().trim()}-${item.capacity?.toLowerCase().trim()}-${item.color?.toLowerCase().trim() || ''}-${item.characteristics?.toLowerCase().trim() || ''}-${item.country?.toLowerCase().trim() || ''}-${normCond.toLowerCase()}`;
        if (!productMap.has(key)) {
            productMap.set(key, { pricesBySupplier: new Map(), itemsInfo: { productName: item.productName, model: item.model, capacity: item.capacity, color: item.color, characteristics: item.characteristics, country: item.country, condition: normCond } });
        }
        const currentEntry = productMap.get(key)!;
        if(item.supplierId && item.priceBRL !== null && item.priceBRL !== undefined) {
           currentEntry.pricesBySupplier.set(item.supplierId, { price: item.priceBRL, supplierId: item.supplierId });
        }
    });
    const aggregatedList: AggregatedProductPrice[] = [];
    productMap.forEach((data, key) => { /* ... (aggregation logic remains similar, using supplierDetailsMap) ... */ 
        if (data.pricesBySupplier.size === 0) return;
        const pricesInfo = Array.from(data.pricesBySupplier.values());
        const prices = pricesInfo.map(p => p.price);
        const sum = prices.reduce((acc, price) => acc + price, 0);
        const avgPriceBRL = sum / prices.length;
        const minPriceBRL = Math.min(...prices);
        const cheapestSupplierInfo = pricesInfo.find(p => p.price === minPriceBRL);
        const cheapestSupplier = cheapestSupplierInfo ? supplierDetailsMap.get(cheapestSupplierInfo.supplierId) : null;
        aggregatedList.push({
            key,
            productName: data.itemsInfo.productName!,
            model: data.itemsInfo.model!,
            capacity: data.itemsInfo.capacity!,
            color: data.itemsInfo.color,
            characteristics: data.itemsInfo.characteristics,
            country: data.itemsInfo.country,
            condition: data.itemsInfo.condition!,
            avgPriceBRL: parseFloat(avgPriceBRL.toFixed(2)),
            minPriceBRL,
            cheapestSupplierId: cheapestSupplier?.id || 'N/A',
            cheapestSupplierName: cheapestSupplier?.name || 'N/A',
            supplierCount: data.pricesBySupplier.size,
            allPrices: pricesInfo.map(pInfo => ({ supplierId: pInfo.supplierId, supplierName: supplierDetailsMap.get(pInfo.supplierId)?.name || 'N/A', priceBRL: pInfo.price }))
        });
    });
    return aggregatedList.sort((a,b) => a.productName.localeCompare(b.productName) || a.model.localeCompare(b.model));
};

// --- Client Payment Services ---
export const getAllClientPayments = async (): Promise<ClientPayment[]> => {
    return apiClient<ClientPayment[]>('/client-payments');
};
export const getClientPaymentsByOrderId = async (orderId: string): Promise<ClientPayment[]> => {
    return apiClient<ClientPayment[]>(`/orders/${orderId}/payments`);
};
export const addClientPayment = async (paymentData: Omit<ClientPayment, 'id'|'userId'>): Promise<ClientPayment> => {
    // The logic to update order's BluFacilita installments should ideally happen on the backend
    // after a payment is successfully recorded, to ensure data integrity.
    // The client might optimistically update, or re-fetch the order.
    const newPayment = await apiClient<ClientPayment>(`/orders/${paymentData.orderId}/payments`, { method: 'POST', body: JSON.stringify(paymentData) });
    // For now, client side BluFacilita update logic after payment is removed from here.
    // Assume backend handles it or order is re-fetched.
    return newPayment;
};

// --- Order Cost Services ---
export const getAllOrderCosts = async (): Promise<OrderCostItem[]> => {
    return apiClient<OrderCostItem[]>('/order-costs');
};
export const getOrderCostsByOrderId = async (orderId: string): Promise<OrderCostItem[]> => {
    return apiClient<OrderCostItem[]>(`/orders/${orderId}/costs`);
};
export const addOrderCostItem = async (costItemData: Omit<OrderCostItem, 'id'|'userId'>): Promise<OrderCostItem> => {
    return apiClient<OrderCostItem>(`/orders/${costItemData.orderId}/costs`, { method: 'POST', body: JSON.stringify(costItemData) });
};
export const deleteOrderCostItem = async (costItemId: string): Promise<void> => {
    // This endpoint might need adjustment, e.g. /costs/:costItemId if costs are global with orderId foreign key
    return apiClient<void>(`/costs/${costItemId}`, { method: 'DELETE' });
};

// --- Dashboard Statistics --- (These will all call backend endpoints)
export const getDashboardStatistics = async () => {
    return apiClient<any>('/dashboard/stats'); // Define a more specific type for stats
};
export const getTodaysTasks = async (): Promise<TodayTask[]> => {
    return apiClient<TodayTask[]>('/dashboard/tasks');
};
export const getDashboardAlerts = async (): Promise<DashboardAlert[]> => {
    return apiClient<DashboardAlert[]>('/dashboard/alerts');
};
export const getWeeklySummaryStats = async (weekOffset: number = 0): Promise<WeeklySummaryStats> => {
    return apiClient<WeeklySummaryStats>(`/dashboard/weekly-summary?offset=${weekOffset}`);
};

export const sendOrderContractToAutentique = async (orderId: string): Promise<void> => {
    await apiClient<void>('/contracts/autentique', { method: 'POST', body: JSON.stringify({ orderId }) });
};

// --- User Management ---
export const getUsers = async (): Promise<User[]> => {
    return apiClient<User[]>('/users');
};

export const inviteUser = async (data: { email: string; password: string; name?: string; role: string; }): Promise<User> => {
    return apiClient<User>('/users', { method: 'POST', body: JSON.stringify(data) });
};

export const updateUserRole = async (userId: string, role: string): Promise<User> => {
    return apiClient<User>(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
};

// CREDIT_CARD_RATES_CONFIG and calculateCreditCardFees can remain client-side as they are pure utility functions.
export const CREDIT_CARD_RATES_CONFIG: CreditCardRate[] = [ 
    { installments: 3, ratePercent: 5.69 }, { installments: 4, ratePercent: 6.59 }, { installments: 5, ratePercent: 7.49 }, { installments: 6, ratePercent: 8.39 }, { installments: 7, ratePercent: 8.59 }, { installments: 8, ratePercent: 9.49 }, { installments: 9, ratePercent: 10.39 }, { installments: 10, ratePercent: 11.29 }, { installments: 11, ratePercent: 12.19 }, { installments: 12, ratePercent: 13.09 },
];
export const calculateCreditCardFees = (desiredNetValue: number): CalculatedCardFeeResult[] => {
    if (desiredNetValue <= 0) return [];
    return CREDIT_CARD_RATES_CONFIG.map(rate => {
        const rateDecimal = rate.ratePercent / 100;
        const amountToChargeCustomer = desiredNetValue / (1 - rateDecimal);
        const installmentValue = amountToChargeCustomer / rate.installments;
        const additionalCostToCustomer = amountToChargeCustomer - desiredNetValue;
        return { installments: rate.installments, ratePercent: rate.ratePercent, amountToChargeCustomer: parseFloat(amountToChargeCustomer.toFixed(2)), installmentValue: parseFloat(installmentValue.toFixed(2)), additionalCostToCustomer: parseFloat(additionalCostToCustomer.toFixed(2)), netValueForBluImports: parseFloat(desiredNetValue.toFixed(2)), };
    });
};
