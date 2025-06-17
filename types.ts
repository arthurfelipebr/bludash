export enum OrderStatus {
  PEDIDO_CRIADO = 'Pedido Criado',
  PAGAMENTO_CONFIRMADO = 'Pagamento Confirmado',
  AGUARDANDO_PAGAMENTO_FORNECEDOR = 'Aguardando Pagar Fornecedor',
  COMPRA_REALIZADA = 'Compra Realizada',
  A_CAMINHO_DO_ESCRITORIO = 'A Caminho do Escritório',
  CHEGOU_NO_ESCRITORIO = 'Chegou no Escritório',
  AGUARDANDO_EMBALAR = 'Aguardando Embalar',
  AGUARDANDO_GERAR_NF = 'Aguardando Gerar NF',
  AGUARDANDO_RETIRADA = 'Aguardando Retirada',
  ENVIADO = 'Enviado',
  ENTREGUE = 'Entregue',
  CANCELADO = 'Cancelado',
}

export enum ProductCondition {
  LACRADO = 'Lacrado',
  NOVO_CAIXA_ABERTA = 'Novo (Caixa Aberta)',
  CPO = 'CPO (Certified Pre-Owned)',
  SEMINOVO = 'Seminovo',
  USADO_EXCELENTE = 'Usado (Excelente Estado)',
  USADO_BOM = 'Usado (Bom Estado)',
  RECONDICIONADO = 'Recondicionado',
}

export enum PaymentMethod {
  A_VISTA = 'À vista (PIX/Dinheiro)',
  CARTAO_CREDITO = 'Cartão de Crédito',
  BLU_FACILITA = 'BluFacilita (Parcelado Loja)',
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = Object.values(PaymentMethod);


export enum BluFacilitaContractStatus {
    EM_DIA = 'Em dia',
    ATRASADO = 'Atrasado',
    PAGO_INTEGRALMENTE = 'Pago Integralmente',
    CANCELADO = 'Cancelado',
}

export const BLU_FACILITA_CONTRACT_STATUS_OPTIONS: BluFacilitaContractStatus[] = Object.values(BluFacilitaContractStatus);


export interface DocumentFile {
  id: string;
  name: string;
  url: string; 
  uploadedAt: string;
  type?: string; 
  size?: number; 
}

export interface Supplier {
  id: string; 
  userId?: string; // Associated with the user who created it (from backend token)
  name: string;
  contactPerson?: string;
  phone: string; 
  email?: string;
  notes?: string;
  registrationDate: string; // ISO string
  // priceListsHistory might be handled differently or simplified if not directly stored with supplier
  priceListsHistory?: Array<{ listId: string; dateAdded: string; rawText: string; notes?: string; processedDate?: string; processedItemsCount?: number; }>;
}

export interface HistoricalParsedProduct {
  id: string;
  supplierId: string;
  listId?: string;
  userId?: string; // Associated with the user who created it
  productName: string;
  model: string;
  capacity: string;
  color?: string;
  characteristics?: string;
  chip?: string;
  country?: string;
  condition: string;
  priceBRL: number | null;
  dateRecorded: string; // ISO string
}

export interface PricingProduct {
  id: string;
  name: string;
  categoryId: string;
  disp: 'Brasil' | 'EUA';
  dustBag: number;
  packaging: number;
  custoBRL?: number;
  custoUSD?: number;
  cambio: number;
  custoOperacional: number;
  nfPercent: number;
  nfProduto: number;
  frete: number;
  valorTabela: number;
  lucroPercent: number;
  caixa: string;
  freteDeclarado?: number;
  freteEuaBr?: number;
  freteRedirecionador?: number;
  impostoImportacao?: number;
  nomeDeclarado?: string;
  precoDeclarado?: number;
}

export interface PricingHistoryEntry {
  id: string;
  userId?: string;
  productId: string;
  price: number;
  recordedAt: string;
}

export interface PricingCategory {
  id: string;
  name: string;
  dustBag: number;
  packaging: number;
}

export interface PricingGlobals {
  nfPercent: number;
  nfProduto: number;
  frete: number;
}


export interface InternalNote {
    id: string;
    date: string;
    note: string;
    userId?: string;
}

export enum OccurrenceType {
    PRODUTO_COM_DEFEITO = 'Produto com defeito',
    BATERIA_NAO_DURA = 'Bateria não dura',
    PRODUTO_DANIFICADO = 'Produto danificado',
    DEVOLUCAO_REEMBOLSO = 'Devolução/reembolso',
    OUTRO = 'Outro',
}
export const OCCURRENCE_TYPE_OPTIONS: OccurrenceType[] = Object.values(OccurrenceType);

export enum OccurrenceStatus {
    ABERTO = 'Aberto',
    EM_ANALISE = 'Em análise',
    SOLUCIONADO = 'Solucionado',
    REEMBOLSADO = 'Reembolsado',
    SEM_SOLUCAO = 'Sem solução',
}
export const OCCURRENCE_STATUS_OPTIONS: OccurrenceStatus[] = Object.values(OccurrenceStatus);

export interface OrderOccurrence {
    id: string;
    orderId: string;
    type: OccurrenceType;
    description: string;
    status: OccurrenceStatus;
    responsible?: string;
    createdAt: string;
    updatedAt: string;
    attachments?: DocumentFile[];
}

export interface BluFacilitaInstallment {
    installmentNumber: number;
    dueDate: string; // ISO Date string
    amount: number; 
    status: 'Pendente' | 'Pago' | 'Pago Parcialmente' | 'Atrasado';
    amountPaid?: number;
    paymentDate?: string; // ISO Date string
    paymentMethodUsed?: string; 
    notes?: string;
}

export interface Order {
  id:string; 
  userId?: string; // Associated with the user who created it
  customerName: string; 
  clientId?: string; 
  productName: string; 
  model: string;
  capacity: string;
  watchSize?: string;
  color: string;
  condition: ProductCondition;
  supplierId?: string; 
  supplierName?: string; 
  purchasePrice: number; 
  sellingPrice?: number; 
  status: OrderStatus;
  estimatedDeliveryDate?: string; 
  orderDate: string; // ISO String
  notes?: string; 
  documents: DocumentFile[]; 
  trackingHistory: Array<{ status: OrderStatus; date: string; notes?: string }>;

  paymentMethod?: PaymentMethod;
  
  downPayment?: number; 
  installments?: number; 
  financedAmount?: number; 
  totalWithInterest?: number; 
  installmentValue?: number; 
  bluFacilitaContractStatus?: BluFacilitaContractStatus;
  imeiBlocked?: boolean; 
  bluFacilitaInstallments?: BluFacilitaInstallment[];

  arrivalDate?: string; 
  imei?: string; 
  arrivalPhotos?: DocumentFile[]; 
  arrivalNotes?: string; 
  batteryHealth?: number; 
  readyForDelivery?: boolean;

  shippingCostSupplierToBlu?: number;
  shippingCostBluToClient?: number;
  trackingCode?: string;
  internalNotes?: InternalNote[];
  whatsAppHistorySummary?: string;

  bluFacilitaUsesSpecialRate?: boolean;
  bluFacilitaSpecialAnnualRate?: number; 
}

export enum ClientType {
    PESSOA_FISICA = 'Pessoa Física',
    PESSOA_JURIDICA = 'Pessoa Jurídica',
}
export const CLIENT_TYPE_OPTIONS: ClientType[] = Object.values(ClientType);

export interface Client {
    id: string; 
    userId?: string; // Associated with the user who created it
    fullName: string;
    cpfOrCnpj: string; 
    email: string;
    phone: string;
    address: string;
    cep: string;
    city: string;
    state: string; 
    clientType: ClientType;
    registrationDate: string; // ISO String
    notes?: string;
    isDefaulter?: boolean; 
    defaulterNotes?: string; 
}

export interface User {
  id: string; // Typically the same as userId from backend
  email: string;
  name?: string; // Name is optional
  role?: string;
  registrationDate?: string;
}

export type AuthenticatedUser = User | null;

export interface AuthContextType {
  currentUser: AuthenticatedUser;
  isAuthLoading: boolean; 
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>; 
  register: (email: string, password: string, name?: string) => Promise<User>; // name is optional
}

export interface NavItem {
  name: string;
  path: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode; 
}

export interface ParsedSupplierProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  product: string;
  model: string;
  capacity: string;
  color?: string;
  characteristics?: string;
  country?: string;
  condition: string;
  priceBRL: number | null;
  priceUSD?: number | null;
  originalTextLine?: string;
}

export interface AggregatedProductPrice {
  key: string;
  productName: string;
  model: string;
  capacity: string;
  color?: string;
  characteristics?: string;
  country?: string;
  condition: string;
  avgPriceBRL: number;
  minPriceBRL: number;
  cheapestSupplierId: string;
  cheapestSupplierName: string;
  supplierCount: number;
  allPrices: Array<{ supplierId: string; supplierName: string; priceBRL: number }>;
}

export interface CalendarEvent {
  id: string;
  title: string; 
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: Order; 
}

export type AppView = 'orders' | 'calendar' | 'suppliers' | 'clients' | 'blufacilita' | 'card-calculator' | 'financial-reports';


export interface GeminiParsedProduct { // This is used for the expected structure from Gemini
  produto?: string;
  modelo?: string;
  capacidade?: string;
  condicao?: string;
  caracteristicas?: string;
  pais?: string;
  cor?: string;
  precoBRL?: number;
  precoUSD?: number;
}

export interface SupplierOption {
    value: string;
    label: string;
}

export type TaskType = 'Prazo de Entrega' | 'Chegou Hoje' | 'Pronto para Envio' | 'Outro';
export interface TodayTask {
  id: string; 
  type: TaskType;
  relatedOrder: Order; 
  description: string; 
  relevantDate: string; 
  priority: number; 
}

export interface CreditCardRate {
  installments: number; 
  ratePercent: number;  
}

export interface CalculatedCardFeeResult {
  installments: number;
  ratePercent: number;
  amountToChargeCustomer: number; 
  installmentValue: number;       
  additionalCostToCustomer: number; 
  netValueForBluImports: number;  
}

export enum CostType {
    COMPRA_FORNECEDOR = 'Compra Fornecedor',
    FRETE_FORNECEDOR_BLU = 'Frete Fornecedor -> Blu',
    FRETE_BLU_CLIENTE = 'Frete Blu -> Cliente',
    IMPOSTOS_TAXAS = 'Impostos e Taxas',
    SERVICOS_TERCEIROS = 'Serviços de Terceiros', 
    MARKETING_VENDAS = 'Marketing e Vendas', 
    CUSTO_BLU_FACILITA = 'Custo BluFacilita (Taxa Interna)', 
    MANUTENCAO_GARANTIA = 'Manutenção/Garantia',
    DEVOLUCAO_PREJUIZO = 'Devolução/Prejuízo',
    OUTROS_CUSTOS = 'Outros Custos',
    TAXA_CARTAO_OPERACAO_BLU = "Taxa Cartão Operação Blu"
}
export const COST_TYPE_OPTIONS: CostType[] = Object.values(CostType);

export interface OrderCostItem {
    id: string; 
    userId?: string;
    orderId: string;
    type: CostType;
    description: string; 
    amount: number;      
    date: string; // ISO String       
}

export const DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE = 0.35; // 35%

export interface DashboardAlert {
    id: string;
    type: 'warning' | 'info' | 'error' | 'success';
    title: string;
    message: string;
    action?: {
        label: string;
        onClick?: () => void; 
        path?: string;        
        orderId?: string;     
    };
}

export interface WeeklySummaryStats {
    startDate: string; 
    endDate: string;   
    ordersArrived: number;
    ordersDelivered: number;
    newBluFacilitaContracts: number;
    totalAmountPaidToSuppliers: number; 
    totalAmountReceivedFromClients: number; 
    totalBluFacilitaFinanced: number; 
}

export interface ClientPayment {
    id: string;
    userId?: string;
    orderId: string;
    paymentDate: string; // ISO Date string
    amountPaid: number;
    paymentMethodUsed: 'PIX' | 'Transferência Bancária' | 'Dinheiro' | 'Cartão de Crédito' | 'Outro';
    installments?: number;
    notes?: string;
}

export interface CustomTableRow {
    id: string;
    Data: string;
    Descrição: string;
    Categoria: string;
    Moeda: string;
    Valor: string;
    Câmbio: string;
    Valor_em_BRL: string;
    Metodo_de_Pagamento: string;
    Status_do_Pagamento: string;
    Fornecedor: string;
    Cliente: string;
    Nota_Fiscal: string;
    Data_de_Vencimento: string;
    Data_de_Pagamento: string;
    Juros_Multa: string;
    Descontos: string;
    Observacoes: string;
}

export interface PricingListItem {
  productId: number;
  productName: string;
  is_cpo?: number | boolean;
  categoryName: string;
  custoBRL: number | null;
  valorTabela: number | null;
  updatedAt?: string;
}
